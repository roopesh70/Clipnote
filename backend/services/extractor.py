import os
import re
import uuid
import logging
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, List
import yt_dlp
from config import settings

logger = logging.getLogger("clipnote.extractor")

YOUTUBE_REGEX = re.compile(
    r'^(https?://)?(www\.)?(youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/|youtube\.com/v/)([a-zA-Z0-9_-]{11})'
)

def is_valid_youtube_url(url: str) -> bool:
    if not url:
        return False
    return bool(YOUTUBE_REGEX.match(url.strip()))

def extract_youtube_id(url: str) -> Optional[str]:
    match = YOUTUBE_REGEX.match(url.strip())
    if match:
        return match.group(4)
    return None

def parse_vtt_timestamp(ts_str: str) -> float:
    parts = ts_str.strip().split(':')
    if len(parts) == 3:
        h, m, s = parts
        return float(h) * 3600 + float(m) * 60 + float(s)
    elif len(parts) == 2:
        m, s = parts
        return float(m) * 60 + float(s)
    return 0.0

def parse_vtt_file(file_path: Path) -> List[Dict[str, Any]]:
    segments = []
    if not file_path.exists():
        return segments

    try:
        content = file_path.read_text(encoding='utf-8', errors='ignore')
        blocks = content.split('\n\n')
        time_regex = re.compile(r'(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})')

        for block in blocks:
            lines = [l.strip() for l in block.split('\n') if l.strip()]
            if len(lines) >= 2:
                match = time_regex.search(lines[0]) or (time_regex.search(lines[1]) if len(lines) > 1 else None)
                if match:
                    start_sec = parse_vtt_timestamp(match.group(1))
                    end_sec = parse_vtt_timestamp(match.group(2))
                    text_lines = [l for l in lines if not time_regex.search(l) and not l.isdigit() and l != 'WEBVTT' and not l.startswith('Kind:') and not l.startswith('Language:')]
                    text = " ".join(text_lines).strip()
                    text = re.sub(r'<[^>]+>', '', text)
                    text = re.sub(r'^[♪♫#\s]+|[♪♫#\s]+$', '', text).strip()
                    if text:
                        segments.append({
                            "start_time": round(start_sec, 2),
                            "end_time": round(end_sec, 2),
                            "text": text
                        })
    except Exception as e:
        logger.warning(f"Error parsing VTT file {file_path}: {e}")

    return segments

class IVideoExtractor:
    """Service interface for video and audio extraction."""

    @staticmethod
    def process_youtube(youtube_url: str, output_dir: Path) -> Dict[str, Any]:
        """
        Extracts audio and available subtitles/captions from a YouTube URL.
        Returns metadata dictionary containing local audio file path, title, duration, and captions if found.
        """
        if not is_valid_youtube_url(youtube_url):
            raise ValueError("Invalid YouTube URL format.")

        video_id = extract_youtube_id(youtube_url) or str(uuid.uuid4())[:8]
        out_template = str(output_dir / f"yt_{video_id}_%(id)s.%(ext)s")

        # Get ffmpeg binary path from imageio_ffmpeg if installed
        ffmpeg_exe = None
        try:
            import imageio_ffmpeg
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
            ffmpeg_dir = os.path.dirname(ffmpeg_exe)
            os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
        except Exception as e:
            logger.warning(f"Could not load imageio_ffmpeg: {e}")

        # Check for cookies file to bypass bot protection on cloud environments
        cookies_file = None
        cookies_env = os.getenv("YOUTUBE_COOKIES_CONTENT")
        if cookies_env:
            temp_cookies_path = output_dir / "temp_cookies.txt"
            try:
                temp_cookies_path.write_text(cookies_env, encoding="utf-8")
                cookies_file = str(temp_cookies_path)
                logger.info(f"Loaded cookies from YOUTUBE_COOKIES_CONTENT env var.")
            except Exception as ce:
                logger.warning(f"Failed to write temp cookies file: {ce}")
        else:
            # Check common paths
            paths_to_check = [
                Path(__file__).resolve().parent.parent / "cookies.txt",
                Path.cwd() / "cookies.txt",
                output_dir / "cookies.txt",
            ]
            for p in paths_to_check:
                if p.exists():
                    cookies_file = str(p)
                    logger.info(f"Found cookies file at: {cookies_file}")
                    break

        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': out_template,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en', 'en-US', 'en-GB'],
            'skip_download': False,
            'quiet': True,
            'no_warnings': True,
        }

        if cookies_file:
            ydl_opts['cookiefile'] = cookies_file

        if ffmpeg_exe and os.path.exists(ffmpeg_exe):
            ydl_opts['ffmpeg_location'] = ffmpeg_exe

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)


            title = info.get('title', f"YouTube Lecture ({video_id})")
            duration = info.get('duration', 0.0)

            # Find generated audio file and VTT subtitle file
            audio_file = None
            for file in output_dir.glob(f"yt_{video_id}_*.*"):
                if file.suffix in ['.mp3', '.m4a', '.wav', '.webm', '.ogg']:
                    audio_file = str(file)
                    break

            # Check for downloaded VTT subtitles
            captions_text = ""
            captions_segments = []

            for vtt_file in output_dir.glob(f"yt_{video_id}_*.vtt"):
                parsed_segs = parse_vtt_file(vtt_file)
                if parsed_segs:
                    captions_segments = parsed_segs
                    captions_text = " ".join([s["text"] for s in parsed_segs])
                    logger.info(f"Successfully extracted {len(parsed_segs)} timestamped caption segments from {vtt_file.name}")
                    break

            return {
                "title": title,
                "duration": duration,
                "audio_path": audio_file,
                "has_captions": bool(captions_segments),
                "captions_text": captions_text,
                "captions_segments": captions_segments,
                "source_type": "youtube",
                "youtube_id": video_id
            }

    @staticmethod
    def process_upload_file(file_path: Path, output_dir: Path) -> Dict[str, Any]:
        """
        Validates uploaded audio/video file, normalizes format to MP3/WAV.
        """
        if not file_path.exists():
            raise FileNotFoundError(f"Uploaded file not found: {file_path}")

        file_size_mb = file_path.stat().st_size / (1024 * 1024)
        if file_size_mb > settings.MAX_UPLOAD_SIZE_MB:
            raise ValueError(f"File size exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_MB} MB.")

        # If it's already audio, return direct path
        title = file_path.stem.replace("_", " ").title()

        return {
            "title": title,
            "duration": 0.0,
            "audio_path": str(file_path),
            "has_captions": False,
            "captions_text": "",
            "captions_segments": [],
            "source_type": "upload"
        }

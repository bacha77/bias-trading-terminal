import os
import time
import json
import logging
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

logger = logging.getLogger("DeskNotifier")

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "telegram_config.json")
_recent_alerts: List[Dict[str, Any]] = []

def get_telegram_config() -> Dict[str, str]:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    tz = os.getenv("TELEGRAM_TIMEZONE", "").strip()
    
    # Check .env
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r") as f:
                for line in f:
                    if "=" in line and not line.startswith("#"):
                        k, v = line.strip().split("=", 1)
                        if k == "TELEGRAM_BOT_TOKEN" and not token:
                            token = v.strip()
                        elif k == "TELEGRAM_CHAT_ID" and not chat_id:
                            chat_id = v.strip()
                        elif k == "TELEGRAM_TIMEZONE" and not tz:
                            tz = v.strip()
        except Exception:
            pass

    # Check saved json config
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                data = json.load(f)
                if not token:
                    token = data.get("bot_token", "").strip()
                if not chat_id:
                    chat_id = data.get("chat_id", "").strip()
                if not tz:
                    tz = data.get("timezone", "").strip()
        except Exception:
            pass
            
    if not tz:
        tz = "America/New_York"
            
    return {"bot_token": token, "chat_id": chat_id, "timezone": tz}

def save_telegram_config(bot_token: str, chat_id: str) -> bool:
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump({"bot_token": bot_token.strip(), "chat_id": chat_id.strip()}, f, indent=2)
        # Update current process environment
        os.environ["TELEGRAM_BOT_TOKEN"] = bot_token.strip()
        os.environ["TELEGRAM_CHAT_ID"] = chat_id.strip()
        return True
    except Exception as e:
        logger.error(f"Failed to save telegram config: {e}")
        return False

def send_telegram_alert(text: str, parse_mode: str = "HTML", reply_markup: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    cfg = get_telegram_config()
    token = cfg.get("bot_token")
    chat_id = cfg.get("chat_id")
    
    if not token or not chat_id:
        return {
            "success": False,
            "status": "not_configured",
            "message": "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured."
        }
        
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload: Dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            if res_data.get("ok"):
                return {"success": True, "status": "delivered", "data": res_data}
            else:
                return {"success": False, "status": "error", "error": res_data.get("description", "Unknown error")}
    except Exception as e:
        logger.error(f"Telegram dispatch error: {e}")
        return {"success": False, "status": "exception", "error": str(e)}

def dispatch_desk_alert(
    title: str,
    details: str,
    category: str = "CRYPTO_TRADE",
    level: str = "INFO",
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Central notification dispatcher:
    1. Formats crisp HTML for Telegram.
    2. Sends to Telegram bot with interactive inline action buttons.
    3. Keeps in-memory buffer of recent alerts for the frontend notification feed.
    """
    global _recent_alerts
    # Format time in local/market time (defaults to US Eastern Time ET, America/New_York)
    try:
        from zoneinfo import ZoneInfo
        cfg = get_telegram_config()
        tz_name = cfg.get("timezone") or os.getenv("TELEGRAM_TIMEZONE", "America/New_York")
        now = datetime.now(ZoneInfo(tz_name))
        now_str = now.strftime("%I:%M:%S %p %Z · %b %d")
    except Exception:
        now = datetime.now().astimezone()
        tz_abbr = now.tzname() or "ET"
        if "Eastern" in tz_abbr:
            tz_abbr = "EDT" if "Daylight" in tz_abbr else "EST"
        now_str = now.strftime(f"%I:%M:%S %p {tz_abbr} · %b %d")
    
    icon_map = {
        "CRYPTO_TRADE": "⚡",
        "OPTIONS_TRADE": "🤖",
        "STOP_LOSS": "🛑",
        "TAKE_PROFIT": "💰",
        "RATCHET": "🔒",
        "GAMMA_WALL": "🏛️",
        "RISK_ALERT": "⚠️"
    }
    icon = icon_map.get(category, "🔔")
    
    # Telegram message format
    tg_lines = [
        f"<b>{icon} B.I.A.S. TERMINAL ALERT</b>",
        f"<b>{title}</b>",
        f"<code>{details}</code>",
        f"<i>Time: {now_str}</i>"
    ]
    if metadata and isinstance(metadata, dict):
        extra = " | ".join([f"{k}: {v}" for k, v in metadata.items() if v is not None])
        if extra:
            tg_lines.append(f"<b>Telemetry:</b> <code>{extra}</code>")
            
    tg_text = "\n".join(tg_lines)

    # Dynamic interactive Telegram inline buttons
    reply_markup = None
    buttons = []
    token_sym = metadata.get("token") if metadata else None
    pair_url = metadata.get("pair_url") if metadata else None
    
    if pair_url:
        buttons.append({"text": "📊 Live Chart", "url": pair_url})
    elif token_sym:
        buttons.append({"text": f"📊 Chart {token_sym}", "url": f"https://dexscreener.com/search?q={token_sym}"})
        
    buttons.append({"text": "🖥️ Open Terminal", "url": "https://bias-trading-terminal-app.web.app"})
    if buttons:
        reply_markup = {"inline_keyboard": [buttons]}

    tg_result = send_telegram_alert(tg_text, reply_markup=reply_markup)
    
    alert_record = {
        "id": f"alert_{int(time.time() * 1000)}",
        "timestamp": time.time(),
        "time": now_str,
        "title": title,
        "details": details,
        "category": category,
        "level": level,
        "telegram_status": tg_result.get("status", "unknown"),
        "metadata": metadata or {}
    }
    
    _recent_alerts.insert(0, alert_record)
    if len(_recent_alerts) > 100:
        _recent_alerts = _recent_alerts[:100]
        
    return {
        "alert": alert_record,
        "telegram": tg_result
    }

def get_recent_desk_alerts(limit: int = 40) -> List[Dict[str, Any]]:
    return _recent_alerts[:limit]

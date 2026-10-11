import os
import smtplib
import ssl
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 465 # SSL
RECIPIENT_DEFAULT = "bacha7@gmail.com"

def get_email_credentials():
    sender_email = os.getenv("GMAIL_SENDER_EMAIL", "").strip()
    app_password = os.getenv("GMAIL_APP_PASSWORD", "").strip()
    
    # Check .env file fallback
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.strip().split("=", 1)
                    if k == "GMAIL_SENDER_EMAIL":
                        sender_email = v.strip()
                    elif k == "GMAIL_APP_PASSWORD":
                        app_password = v.strip()
                        
    return {
        "sender": sender_email,
        "password": app_password.replace(" ", "") # strip spaces in 16-char app password
    }

def send_email(subject: str, html_body: str, recipient: str = RECIPIENT_DEFAULT):
    creds = get_email_credentials()
    if not creds["sender"] or not creds["password"]:
        return {
            "success": False,
            "error": "Missing GMAIL_SENDER_EMAIL or GMAIL_APP_PASSWORD in environment or .env"
        }
        
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"B.I.A.S. Terminal Alerts <{creds['sender']}>"
        msg["To"] = recipient

        # Fallback plain text
        plain_text = f"B.I.A.S. Trading Terminal Alert:\n\n{subject}\n\nPlease view in an HTML-compatible email client to see live GEX charts and institutional metrics."
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context) as server:
            server.login(creds["sender"], creds["password"])
            server.sendmail(creds["sender"], recipient, msg.as_string())

        return {"success": True, "sent_to": recipient, "timestamp": time.time()}
    except Exception as e:
        return {"success": False, "error": str(e)}

def render_premarket_briefing_html(spy_opt: dict, qqq_opt: dict, macro_events: list, regime_data: dict, breakout_stocks: list = None) -> str:
    now_str = datetime.now().strftime("%A, %B %d, %Y · 09:00 AM ET")
    if breakout_stocks is None:
        breakout_stocks = []
    
    def _gex_row(ticker, opt):
        g = opt.get("gex", {})
        spot = opt.get("spot", 0)
        cw = g.get("call_wall", "--")
        pw = g.get("put_wall", "--")
        flip = g.get("flip", "--")
        bias = opt.get("playbook", {}).get("bias", "NEUTRAL")
        return f"""
        <tr style="border-bottom: 1px solid #222;">
            <td style="padding: 10px; font-weight: bold; color: #fff;">{ticker}</td>
            <td style="padding: 10px; color: #00FF66; font-family: monospace;">${spot:.2f}</td>
            <td style="padding: 10px; color: #00FF66; font-family: monospace;">${cw}</td>
            <td style="padding: 10px; color: #FF3366; font-family: monospace;">${pw}</td>
            <td style="padding: 10px; color: #FFCC00; font-family: monospace;">${flip}</td>
            <td style="padding: 10px; font-weight: bold; color: {'#00FF66' if 'BULL' in bias else '#FF3366' if 'BEAR' in bias else '#aaa'};">{bias}</td>
        </tr>
        """

    events_html = ""
    for ev in macro_events[:4]:
        events_html += f"""
        <div style="background: #111; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #FFCC00;">
            <span style="color: #FFCC00; font-weight: bold; font-size: 12px;">{ev.get('time', '')}</span> - 
            <span style="color: #fff; font-size: 13px;">{ev.get('event', '')}</span> 
            <span style="color: #888; font-size: 11px;">(Forecast: {ev.get('forecast', '--')} | Impact: {ev.get('impact', 'HIGH')})</span>
        </div>
        """

    # Breakout scanner table rows
    breakouts_html = ""
    strong_movers = [b for b in breakout_stocks if b.get("signal") in ["STRONG CALL", "STRONG PUT", "CALL", "PUT"]][:6]
    for b in strong_movers:
        sig = b.get("signal", "")
        is_call = "CALL" in sig
        sig_color = "#00FF66" if is_call else "#FF3366"
        breakouts_html += f"""
        <tr style="border-bottom: 1px solid #1a1e28;">
            <td style="padding: 8px; font-weight: bold; color: #fff;">{b.get('ticker', '')}</td>
            <td style="padding: 8px; color: #fff; font-family: monospace;">${b.get('price', 0):.2f}</td>
            <td style="padding: 8px; color: #FFCC00; font-family: monospace; font-weight: bold;">{b.get('volume_multiplier', '1.0x')}</td>
            <td style="padding: 8px; color: {sig_color}; font-weight: bold;">{sig}</td>
            <td style="padding: 8px; color: #888; font-size: 11px;">{b.get('category', 'LIQUID')}</td>
        </tr>
        """

    regime_str = regime_data.get("regime", "BALANCED / LOW VOLATILITY")

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="background-color: #050508; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; margin: 0;">
        <div style="max-width: 650px; margin: 0 auto; background-color: #0b0c10; border: 1px solid #1f2430; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(90deg, #0d1117, #161b22); padding: 20px; border-bottom: 2px solid #00FF66;">
                <h1 style="margin: 0; color: #ffffff; font-size: 20px; letter-spacing: 1px;">B.I.A.S. TRADING TERMINAL</h1>
                <p style="margin: 4px 0 0 0; color: #00FF66; font-size: 12px; font-weight: bold;">DAILY PRE-MARKET OPTIONS, GEX & BREAKOUT SCANNER</p>
                <p style="margin: 4px 0 0 0; color: #888888; font-size: 11px;">{now_str}</p>
            </div>

            <div style="padding: 20px;">
                <div style="background: #161b22; padding: 12px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #30363d;">
                    <span style="color: #8b949e; font-size: 11px; text-transform: uppercase;">Current Market Regime:</span>
                    <div style="color: #58a6ff; font-size: 14px; font-weight: bold; margin-top: 2px;">{regime_str}</div>
                </div>

                <h3 style="color: #ffffff; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase;">1. Institutional GEX Levels (Options Battlefield)</h3>
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; margin-bottom: 25px;">
                    <thead>
                        <tr style="border-bottom: 2px solid #333; color: #888; text-transform: uppercase; font-size: 10px;">
                            <th style="padding: 8px;">Ticker</th>
                            <th style="padding: 8px;">Spot</th>
                            <th style="padding: 8px;">Call Wall (Res)</th>
                            <th style="padding: 8px;">Put Wall (Supp)</th>
                            <th style="padding: 8px;">Gamma Flip</th>
                            <th style="padding: 8px;">Bias</th>
                        </tr>
                    </thead>
                    <tbody>
                        {_gex_row('SPY', spy_opt)}
                        {_gex_row('QQQ', qqq_opt)}
                    </tbody>
                </table>

                {f'''
                <h3 style="color: #ffffff; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase;">2. Institutional Breakout Scanner (High Volume & Momentum)</h3>
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; margin-bottom: 25px;">
                    <thead>
                        <tr style="border-bottom: 2px solid #333; color: #888; text-transform: uppercase; font-size: 10px;">
                            <th style="padding: 8px;">Symbol</th>
                            <th style="padding: 8px;">Price</th>
                            <th style="padding: 8px;">Vol Spike</th>
                            <th style="padding: 8px;">Breakout Signal</th>
                            <th style="padding: 8px;">Sector</th>
                        </tr>
                    </thead>
                    <tbody>
                        {breakouts_html}
                    </tbody>
                </table>
                ''' if breakouts_html else ''}

                <h3 style="color: #ffffff; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase;">3. Upcoming High-Impact Catalysts Today</h3>
                {events_html if events_html else '<p style="color: #888; font-size: 12px;">No high-impact macro risk events scheduled for today.</p>'}

                <div style="margin-top: 25px; padding: 14px; background: #0d1117; border-radius: 8px; border: 1px solid #238636; text-align: center;">
                    <a href="https://money.maisonrx.life" style="display: inline-block; background: #00FF66; color: #000000; font-weight: bold; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 13px;">
                        LAUNCH LIVE TRADING TERMINAL →
                    </a>
                </div>
            </div>

            <div style="background-color: #07090e; padding: 12px 20px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #1a1e28;">
                B.I.A.S. Quantitative Terminal · For personal trading execution · Not financial advice
            </div>
        </div>
    </body>
    </html>
    """

def render_breakout_alert_html(ticker: str, signal: str, price: float, vol_mult: str, category: str) -> str:
    now_str = datetime.now().strftime("%H:%M:%S ET · %b %d, %Y")
    is_call = "CALL" in signal.upper()
    theme_color = "#00FF66" if is_call else "#FF3366"
    bg_gradient = "#0d2818" if is_call else "#2d1017"

    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="background-color: #050508; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0b0c10; border: 1px solid {theme_color}; border-radius: 12px; overflow: hidden; box-shadow: 0 0 20px rgba({ '0,255,102,0.15' if is_call else '255,51,102,0.15' });">
            <div style="background: {bg_gradient}; padding: 18px; border-bottom: 2px solid {theme_color};">
                <span style="background: {theme_color}; color: #000; font-weight: bold; font-size: 10px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
                    UNUSUAL VOLUME BREAKOUT ALERT
                </span>
                <h1 style="margin: 8px 0 0 0; color: #ffffff; font-size: 22px;">{ticker} · {signal}</h1>
                <p style="margin: 4px 0 0 0; color: #888888; font-size: 11px;">{now_str}</p>
            </div>

            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px; background: #161b22; padding: 12px; border-radius: 8px;">
                    <div>
                        <div style="font-size: 10px; color: #888; text-transform: uppercase;">Spot Price</div>
                        <div style="font-size: 18px; font-weight: bold; color: #fff; font-family: monospace;">${price:.2f}</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; color: #888; text-transform: uppercase;">Volume Spike</div>
                        <div style="font-size: 18px; font-weight: bold; color: #FFCC00; font-family: monospace;">{vol_mult}</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; color: #888; text-transform: uppercase;">Category</div>
                        <div style="font-size: 14px; font-weight: bold; color: #58a6ff; margin-top: 3px;">{category}</div>
                    </div>
                </div>

                <div style="background: #111; padding: 12px; border-radius: 8px; font-size: 13px; color: #ddd; line-height: 1.5; margin-bottom: 20px; border-left: 3px solid {theme_color};">
                    <strong>Scanner Detection:</strong> Institutional volume surge detected. Algorithm recommends <strong>{'CALL OPTION ENTRY / BULLISH MOMENTUM' if is_call else 'PUT OPTION ENTRY / BEARISH BREAKDOWN'}</strong> based on multi-timeframe order flow.
                </div>

                <div style="text-align: center;">
                    <a href="https://money.maisonrx.life" style="display: inline-block; background: {theme_color}; color: #000; font-weight: bold; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 13px;">
                        INSPECT {ticker} ON LIVE TERMINAL →
                    </a>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

def render_high_conviction_alert_html(ticker: str, alert_type: str, details: dict) -> str:
    now_str = datetime.now().strftime("%H:%M:%S ET · %b %d, %Y")
    conviction = details.get("conviction", "--")
    price = details.get("price", "--")
    summary = details.get("summary", "")
    action = details.get("action", "MONITOR SETUP")
    is_bull = "BUY" in action or "BULL" in alert_type.upper()

    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="background-color: #050508; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0b0c10; border: 1px solid {'#00FF66' if is_bull else '#FF3366'}; border-radius: 12px; overflow: hidden; box-shadow: 0 0 20px rgba({'0,255,102,0.15' if is_bull else '255,51,102,0.15'});">
            <div style="background: {'#0d2818' if is_bull else '#2d1017'}; padding: 18px; border-bottom: 2px solid {'#00FF66' if is_bull else '#FF3366'};">
                <span style="background: {'#00FF66' if is_bull else '#FF3366'}; color: #000; font-weight: bold; font-size: 10px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
                    HIGH-CONVICTION SIGNAL
                </span>
                <h1 style="margin: 8px 0 0 0; color: #ffffff; font-size: 22px;">{ticker} · {alert_type}</h1>
                <p style="margin: 4px 0 0 0; color: #888888; font-size: 11px;">{now_str}</p>
            </div>

            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px; background: #161b22; padding: 12px; border-radius: 8px;">
                    <div>
                        <div style="font-size: 10px; color: #888; text-transform: uppercase;">Spot Price</div>
                        <div style="font-size: 18px; font-weight: bold; color: #fff; font-family: monospace;">${price}</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; color: #888; text-transform: uppercase;">Algo Conviction</div>
                        <div style="font-size: 18px; font-weight: bold; color: {'#00FF66' if is_bull else '#FF3366'}; font-family: monospace;">{conviction}</div>
                    </div>
                    <div>
                        <div style="font-size: 10px; color: #888; text-transform: uppercase;">Action Bias</div>
                        <div style="font-size: 14px; font-weight: bold; color: {'#00FF66' if is_bull else '#FF3366'}; margin-top: 3px;">{action}</div>
                    </div>
                </div>

                <div style="background: #111; padding: 12px; border-radius: 8px; font-size: 13px; color: #ddd; line-height: 1.5; margin-bottom: 20px;">
                    <strong>Setup Analysis:</strong> {summary}
                </div>

                <div style="text-align: center;">
                    <a href="https://money.maisonrx.life" style="display: inline-block; background: {'#00FF66' if is_bull else '#FF3366'}; color: #000; font-weight: bold; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 13px;">
                        OPEN LIVE TERMINAL EXECUTION →
                    </a>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

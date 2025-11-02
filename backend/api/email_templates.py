from datetime import datetime
from typing import Any, Dict, List, Optional


def render_digest_email(media_items: List[Dict[str, Any]], student_name: Optional[str] = None) -> str:
    """
    Generates an HTML digest highlighting recent Instagram media with optional narration links.
    """
    intro_name = student_name or "your student"
    formatted_items = []

    for item in media_items:
        caption = item.get("caption") or "We captured a new moment for your family archive."
        audio_url = item.get("audio_url")
        image_fallback = item.get("source_url") or "#"
        processed_at = item.get("processed_at") or item.get("created_at")
        processed_label = ""
        if processed_at:
            try:
                processed_dt = datetime.fromisoformat(processed_at.replace("Z", "+00:00"))
                processed_label = processed_dt.strftime("%B %d, %Y")
            except ValueError:
                processed_label = processed_at

        audio_section = ""
        if audio_url:
            audio_section = f"""
                <p style="margin: 8px 0;">
                    <strong>Listen:</strong>
                    <a href="{audio_url}" style="color: #6C63FF; text-decoration: underline;">Play narrated update</a>
                </p>
                <audio controls style="width: 100%; margin-top: 8px;">
                    <source src="{audio_url}" type="audio/mpeg" />
                    <p>Your device cannot play the audio clip. Download it <a href="{audio_url}">here</a>.</p>
                </audio>
            """

        formatted_items.append(
            f"""
            <tr>
                <td style="padding: 16px; border-bottom: 1px solid #e4e7ec;">
                    <div style="font-size: 14px; color: #475467; margin-bottom: 8px;">{processed_label}</div>
                    <img src="{image_fallback}" alt="Latest memory from {intro_name}" style="width: 100%; border-radius: 12px; object-fit: cover;" />
                    <p style="margin: 12px 0; font-size: 16px; color: #344054; line-height: 1.4;">{caption}</p>
                    {audio_section}
                </td>
            </tr>
            """
        )

    memories_html = "".join(formatted_items) or """
        <tr>
            <td style="padding: 32px; text-align: center; color: #667085;">
                No new memories yet, but we are ready to capture the next moment.
            </td>
        </tr>
    """

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>LifeLoop Legacy Digest</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin: 0; background-color: #f4f5fb; font-family: 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
                <td align="center" style="padding: 32px;">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden;">
                        <tr>
                            <td style="padding: 32px; text-align: center; background-color: #6C63FF; color: #ffffff;">
                                <h1 style="margin: 0; font-size: 28px;">LifeLoop Legacy Digest</h1>
                                <p style="margin: 12px 0 0; font-size: 16px;">
                                    Fresh highlights from {intro_name}'s story so everyone stays connected.
                                </p>
                            </td>
                        </tr>
                        {memories_html}
                        <tr>
                            <td style="padding: 24px; background-color: #f8f9ff; color: #475467; font-size: 14px;">
                                <p style="margin: 0 0 12px;">
                                    LifeLoop bridges students, parents, and grandparents with narrated memories, AI captions, and keepsakes.
                                </p>
                                <p style="margin: 0; font-size: 13px; color: #98A2B3;">
                                    Future roadmap: printable photobooks, facial recognition tagging, and automated Instagram archive imports.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def render_parent_confirmation_email(
    *,
    student_name: Optional[str],
    confirmation_url: str,
    instagram_username: Optional[str],
) -> str:
    """
    HTML email inviting a parent/guardian to confirm LifeLoop ingestion.
    """
    intro_name = student_name or "your student"
    instagram_line = ""
    if instagram_username:
        instagram_line = f"""
            <p style="margin: 12px 0 0; font-size: 15px; color: #475467;">
                Instagram handle on file: <strong>@{instagram_username}</strong>
            </p>
        """

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>Confirm LifeLoop Updates for {intro_name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin:0; background-color:#f4f5fb; font-family:'Helvetica Neue',Arial,sans-serif; color:#1f2933;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
                <td align="center" style="padding:32px;">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden;">
                        <tr>
                            <td style="padding:32px; background-color:#6C63FF; color:#ffffff;">
                                <h1 style="margin:0; font-size:26px;">Help {intro_name} preserve their legacy</h1>
                                <p style="margin:12px 0 0; font-size:16px;">
                                    LifeLoop bridges students, parents, and grandparents with curated memories and narrated highlights.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:28px 32px;">
                                <p style="margin:0 0 16px; font-size:16px; line-height:1.6;">
                                    {intro_name} invited you to receive warm recaps of their campus journey. With your permission,
                                    LifeLoop will safely collect public Instagram posts, craft AI captions, and share optional narrated updates
                                    so grandparents stay in the loop.
                                </p>
                                {instagram_line}
                                <p style="margin:20px 0 24px; font-size:15px; color:#475467;">
                                    To approve and keep the family connected, please confirm your consent below.
                                </p>
                                <p style="margin:0;">
                                    <a href="{confirmation_url}" style="display:inline-block; padding:14px 28px; background-color:#6C63FF; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600;">
                                        Confirm &amp; Start Receiving Updates
                                    </a>
                                </p>
                                <p style="margin:24px 0 0; font-size:13px; color:#98A2B3; line-height:1.5;">
                                    By confirming, you acknowledge that LifeLoop will cache a copy of shared posts for family viewing.
                                    You can revoke access at any time and we will remove stored content. Future enhancements include printable
                                    photobooks and optional facial recognition for tagging loved ones.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:24px; background-color:#f8f9ff; font-size:13px; color:#667085;">
                                <p style="margin:0;">
                                    Questions? Reply to this email or contact the LifeLoop team.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

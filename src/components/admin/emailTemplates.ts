import { GOOGLE_PLAY_URL, APP_STORE_URL } from "@/lib/storeUrls";
import { FOLLOW_URL, IOS_EVENT_URL } from "@/lib/launch";

/**
 * Nexzy designed email (dark, gaming) for the admin email tool. Works in BOTH:
 *  - Custom HTML mode (the API fills the variables), and
 *  - SendGrid: paste into a Dynamic Template's Code editor, set the template
 *    Subject to {{subject}}; the API passes the same variables per recipient.
 *
 * Email-client safe: table layout, inline styles, 600px, bulletproof buttons,
 * Outlook (MSO) fallbacks, hidden preheader, JPG/PNG images only.
 * Variables: {{subject}} {{preheader}} {{eyebrow}} {{headline}} {{intro}}
 * {{video_label}} {{video_url}} {{ios_label}} {{ios_url}} {{android_label}}
 * {{android_url}} {{secondary_label}} {{secondary_url}} {{signoff}}
 * {{unsubscribe_url}} (always provided by the API).
 */
export const NEXZY_EMAIL_HTML = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>{{subject}}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{mso-table-lspace:0;mso-table-rspace:0}
  img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;display:block}
  a{text-decoration:none}
  @media only screen and (max-width:620px){
    .container{width:100%!important}
    .px{padding-left:20px!important;padding-right:20px!important}
    .h1{font-size:26px!important;line-height:32px!important}
    .stack{display:block!important;width:100%!important;padding-left:0!important;padding-right:0!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#070b14;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#070b14;">{{preheader}}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#070b14;">
<tr><td align="center" style="padding:28px 12px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

    <tr><td class="px" style="padding:0 32px 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding-right:10px;"><img src="https://www.nexzyapp.com/android-chrome-192x192.png" width="36" height="36" alt="Nexzy" style="border-radius:9px;width:36px;height:36px;"></td>
        <td style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:800;letter-spacing:2px;color:#ffffff;">NEXZY</td>
      </tr></table>
    </td></tr>

    <tr><td style="background:#0f1626;border:1px solid #1d2a44;border-radius:18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td class="px" style="padding:36px 40px 8px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#5ab0ff;">{{eyebrow}}</p>
          <h1 class="h1" style="margin:0 0 14px;font-size:32px;line-height:38px;font-weight:800;color:#ffffff;">{{headline}}</h1>
          <p style="margin:0 0 24px;font-size:16px;line-height:25px;color:#c7d0e0;">{{intro}}</p>
        </td></tr>

        <tr><td class="px" style="padding:0 40px 10px;">
          <a href="{{video_url}}"><img src="https://www.nexzyapp.com/follow/og.jpg" width="520" alt="Watch the Nexzy trailer" style="width:100%;max-width:520px;height:auto;border-radius:12px;"></a>
        </td></tr>
        <tr><td class="px" style="padding:0 40px 26px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
          <a href="{{video_url}}" style="font-size:15px;font-weight:700;color:#5ab0ff;">{{video_label}} &rarr;</a>
        </td></tr>

        <tr><td class="px" style="padding:0 40px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td class="stack" width="50%" valign="top" style="padding:0 6px 10px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td align="center" bgcolor="#2563eb" style="border-radius:10px;">
                  <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{ios_url}}" style="height:48px;v-text-anchor:middle;width:250px;" arcsize="20%" stroke="f" fillcolor="#2563eb"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">{{ios_label}}</center></v:roundrect><![endif]-->
                  <!--[if !mso]><!--><a href="{{ios_url}}" style="display:block;padding:14px 10px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;border-radius:10px;">{{ios_label}}</a><!--<![endif]-->
                </td>
              </tr></table>
            </td>
            <td class="stack" width="50%" valign="top" style="padding:0 0 10px 6px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td align="center" bgcolor="#16a34a" style="border-radius:10px;">
                  <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{android_url}}" style="height:48px;v-text-anchor:middle;width:250px;" arcsize="20%" stroke="f" fillcolor="#16a34a"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">{{android_label}}</center></v:roundrect><![endif]-->
                  <!--[if !mso]><!--><a href="{{android_url}}" style="display:block;padding:14px 10px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;border-radius:10px;">{{android_label}}</a><!--<![endif]-->
                </td>
              </tr></table>
            </td>
          </tr></table>
        </td></tr>
        <tr><td class="px" style="padding:0 40px 30px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
          <a href="{{secondary_url}}" style="font-size:15px;font-weight:600;color:#5ab0ff;">{{secondary_label}} &rarr;</a>
        </td></tr>

        <tr><td class="px" style="padding:0 40px;"><div style="border-top:1px solid #1d2a44;font-size:0;line-height:0;">&nbsp;</div></td></tr>

        <tr><td class="px" style="padding:26px 40px 8px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:0 0 16px;">
              <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#ffffff;">Follow any game</p>
              <p style="margin:0;font-size:14px;line-height:21px;color:#9aa6bd;">Its news, trailers and updates land in one feed.</p>
            </td></tr>
            <tr><td style="padding:0 0 16px;">
              <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#ffffff;">Library and wishlist</p>
              <p style="margin:0;font-size:14px;line-height:21px;color:#9aa6bd;">Keep track of what you play, and get a price alert when a wishlisted game goes on sale.</p>
            </td></tr>
            <tr><td style="padding:0 0 16px;">
              <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#ffffff;">Gamers who get them</p>
              <p style="margin:0;font-size:14px;line-height:21px;color:#9aa6bd;">Post about what you're playing and meet people with your taste.</p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td class="px" style="padding:4px 40px 36px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
          <p style="margin:0;font-size:15px;line-height:23px;color:#c7d0e0;">{{signoff}}</p>
        </td></tr>
      </table>
    </td></tr>

    <tr><td class="px" align="center" style="padding:24px 32px 8px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#c7d0e0;">Follow the games you love. And the gamers who get them.</p>
      <p style="margin:0;font-size:12px;line-height:19px;color:#6b7690;">You're getting this because you have a Nexzy account or signed up for Nexzy updates.<br><a href="{{unsubscribe_url}}" style="color:#6b7690;text-decoration:underline;">Unsubscribe</a> &middot; <a href="https://www.nexzyapp.com" style="color:#6b7690;text-decoration:underline;">nexzyapp.com</a></p>
    </td></tr>

  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;

export interface EmailPreset {
  key: string;
  label: string;
  subject: string;
  preheader: string;
  /** Simple-message body (text mode). */
  body: string;
  /** Variables for the designed template (HTML + SendGrid modes). */
  data: Record<string, string>;
}

const APP_STORE = APP_STORE_URL;
const IOS_EVENT = IOS_EVENT_URL;
const PLAY = GOOGLE_PLAY_URL;
const FOLLOW = FOLLOW_URL;
/** Unlisted YouTube promo (Short). */
const VIDEO = "https://youtube.com/shorts/4sYiwzZoA08";

export const EMAIL_PRESETS: EmailPreset[] = [
  {
    key: "teaser",
    label: "Email 1 - teaser (Oct 13)",
    subject: "The new Nexzy arrives Oct 21",
    preheader: "Follow the games you love. And the gamers who get them.",
    body: `The new Nexzy lands Wednesday, October 21.

Follow the games you love and their news, trailers and updates come to you in one feed. Keep your library and wishlist in one place, get a price alert when a wishlisted game goes on sale, and meet gamers who play what you play.

On iPhone? Tap below and hit "Notify me" to get pinged the moment it's live.

[Get notified on the App Store](${IOS_EVENT})

On Android? [Install Nexzy now](${PLAY}) and the new version arrives as an automatic update on October 21.

Want a sneak peek first? [Watch the trailer](${VIDEO}) or [see what's coming](${FOLLOW}).

Already have Nexzy? The update arrives automatically on iPhone and Android.

The Nexzy team`,
    data: {
      eyebrow: "Coming Wednesday, October 21",
      headline: "The new Nexzy is almost here",
      intro:
        "Follow the games you love and their news, trailers and updates come to you in one feed. Keep your library and wishlist in one place, and meet gamers who play what you play.",
      video_label: "Watch the trailer",
      video_url: VIDEO,
      ios_label: "Notify me on iPhone",
      ios_url: IOS_EVENT,
      android_label: "Install now on Android",
      android_url: PLAY,
      secondary_label: "See what's coming",
      secondary_url: FOLLOW,
      signoff:
        "Already have Nexzy, or install it today? The new version arrives as an automatic update on October 21.",
    },
  },
  {
    key: "launch",
    label: "Email 2 - launch day (Oct 21)",
    subject: "Your gaming feed is live",
    preheader: "Follow a game and watch your feed fill up.",
    body: `The new Nexzy is live on iPhone and Android.

Follow a few games and your feed fills up with their news, trailers and updates. Your library and wishlist live in the same place, and you'll get a price alert when a wishlisted game drops.

[Get it on the App Store](${APP_STORE})

[Get it on Google Play](${PLAY})

[Watch the trailer](${VIDEO})

Follow three games, then hit reply and tell us what your feed got right and what it missed.

The Nexzy team`,
    data: {
      eyebrow: "Out now on iPhone and Android",
      headline: "Your gaming feed is live",
      intro:
        "Follow a few games and your feed fills up with their news, trailers and updates. Your library and wishlist live in the same place, with a price alert when a wishlisted game drops.",
      video_label: "Watch the trailer",
      video_url: VIDEO,
      ios_label: "Download on the App Store",
      ios_url: APP_STORE,
      android_label: "Get it on Google Play",
      android_url: PLAY,
      secondary_label: "See everything that's new",
      secondary_url: FOLLOW,
      signoff:
        "Follow three games, then hit reply and tell us what your feed got right and what it missed.",
    },
  },
];

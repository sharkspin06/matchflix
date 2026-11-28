/**
 * Cinephile email relay - Google Apps Script.
 *
 * Sends the backend's emails (sign-up codes) from your own Gmail account over HTTPS,
 * so it works on hosts that block SMTP (e.g. Render's free plan).
 * Free Gmail accounts can send to about 100 recipients a day this way.
 *
 * Setup:
 *   1. script.google.com > New project > paste this file > save.
 *   2. Project Settings > Script Properties > add  SECRET = <a long random string>.
 *   3. Deploy > New deployment > type "Web app"
 *        Execute as: Me      Who has access: Anyone
 *      Authorize when asked, then copy the Web app URL (ends in /exec).
 *   4. Backend env:  GMAIL_SCRIPT_URL=<that URL>   GMAIL_SCRIPT_SECRET=<same SECRET>
 *
 * After editing this script, use Deploy > Manage deployments > edit > New version,
 * otherwise the URL keeps running the old code.
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('SECRET');

    if (!secret || data.secret !== secret) {
      return reply({ ok: false, error: 'Unauthorized' });
    }
    if (!data.to || !data.subject) {
      return reply({ ok: false, error: 'Missing "to" or "subject"' });
    }

    MailApp.sendEmail({
      to: data.to,
      subject: data.subject,
      body: data.text || '',
      htmlBody: data.html || undefined,
      name: data.fromName || 'Cinephile',
    });

    return reply({ ok: true, remainingQuota: MailApp.getRemainingDailyQuota() });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

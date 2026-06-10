// Minimal Brevo (ex-Sendinblue) REST client for the two things we need:
// subscribing a contact to the newsletter list, and sending the transactional
// recovery email. All calls are best-effort and never throw to the caller —
// email is a nicety, not a blocker for playing.
//
// Required runtime config (see wrangler.jsonc vars + `wrangler secret`):
//   BREVO_API_KEY      secret, the xkeysib-... key
//   BREVO_LIST_ID      newsletter list id (number as string)
//   BREVO_SENDER_EMAIL verified sender address
//   BREVO_SENDER_NAME  display name for the sender

interface BrevoConfig {
  apiKey?: string;
  listId?: string;
  senderEmail?: string;
  senderName?: string;
}

const API = 'https://api.brevo.com/v3';

async function call(config: BrevoConfig, path: string, body: unknown): Promise<boolean> {
  if (!config.apiKey) return false;
  try {
    const response = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: {
        'api-key': config.apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(6000),
    });
    // 2xx covers create; 204 (no content) and 201 are both fine. Brevo returns
    // 400 with code "duplicate_parameter" if the contact already exists, which
    // for our purposes (idempotent subscribe) is a success.
    if (response.ok) return true;
    if (response.status === 400) {
      const text = await response.text();
      return text.includes('duplicate');
    }
    return false;
  } catch {
    return false;
  }
}

// Adds (or updates) a contact and subscribes it to the newsletter list.
export function subscribeToNewsletter(config: BrevoConfig, email: string): Promise<boolean> {
  if (!config.listId) return Promise.resolve(false);
  return call(config, '/contacts', {
    email,
    listIds: [Number(config.listId)],
    updateEnabled: true,
  });
}

// Sends the recovery email listing the player's cards as owner links.
export function sendRecoveryEmail(
  config: BrevoConfig,
  email: string,
  links: { id: string; url: string; completed: boolean }[],
): Promise<boolean> {
  if (!config.senderEmail) return Promise.resolve(false);

  const items = links
    .map(
      (link) =>
        `<li style="margin:0 0 10px"><a href="${link.url}">Cartón nº ${link.id}</a>${
          link.completed ? ' — ¡bingo cantado!' : ''
        }</li>`,
    )
    .join('');

  const htmlContent = `
    <div style="font-family:system-ui,sans-serif;color:#221f1a">
      <h1 style="color:#11503c">Tus cartones del Bingo del Cargador</h1>
      <p>Aquí tienes tus cartones. Cada enlace es tuyo: ábrelo en el dispositivo que quieras para seguir jugando donde lo dejaste.</p>
      <ul style="padding-left:18px">${items}</ul>
      <p style="color:#8a8170;font-size:13px">No compartas estos enlaces: quien los tenga puede marcar tu cartón.</p>
      <p style="color:#8a8170;font-size:13px">bingo.gruxon.com</p>
    </div>`;

  return call(config, '/smtp/email', {
    sender: { email: config.senderEmail, name: config.senderName ?? 'El Bingo del Cargador' },
    to: [{ email }],
    subject: 'Tus cartones del Bingo del Cargador',
    htmlContent,
  });
}

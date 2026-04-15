/**
 * Script para gerar o Refresh Token do Google Drive (executa UMA VEZ).
 * 
 * COMO USAR:
 * 1. Vá ao Google Cloud Console > APIs & Services > Credentials
 * 2. Clique em "Create Credentials" > "OAuth client ID"
 * 3. Tipo: "Desktop app" (ou "Web application")
 *    - Se Web application: adicione http://localhost:3333 como Authorized redirect URI
 * 4. Copie o Client ID e Client Secret
 * 5. Rode: node scripts/get-drive-token.js CLIENT_ID CLIENT_SECRET
 * 6. Abra o link no navegador, faça login, autorize
 * 7. Copie o refresh_token exibido no terminal e cole no .env
 */

const http = require('http');
const { google } = require('googleapis');
const url = require('url');

const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ USO: node scripts/get-drive-token.js <CLIENT_ID> <CLIENT_SECRET>\n');
  console.error('Obtenha esses valores em: https://console.cloud.google.com/apis/credentials\n');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3333';
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent', // Forçar consent para garantir refresh_token
});

console.log('\n🔗 Abra esta URL no navegador e faça login com sua conta Google:\n');
console.log(authUrl);
console.log('\n⏳ Aguardando callback em http://localhost:3333 ...\n');

const server = http.createServer(async (req, res) => {
  const queryParams = url.parse(req.url, true).query;
  
  if (queryParams.code) {
    try {
      const { tokens } = await oauth2Client.getToken(queryParams.code);
      
      console.log('\n✅ SUCESSO! Adicione estas linhas ao seu arquivo .env:\n');
      console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
      console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\n');
      
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html><body style="font-family: sans-serif; text-align: center; padding: 3rem;">
          <h1 style="color: green;">✅ Autorização concluída!</h1>
          <p>Refresh token gerado! Volte ao terminal para copiá-lo.</p>
          <p>Pode fechar esta aba.</p>
        </body></html>
      `);
      
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);
    } catch (err) {
      console.error('❌ Erro ao trocar código por token:', err.message);
      res.writeHead(500);
      res.end('Erro: ' + err.message);
    }
  } else if (queryParams.error) {
    console.error('❌ Usuário negou acesso:', queryParams.error);
    res.writeHead(400);
    res.end('Acesso negado: ' + queryParams.error);
    server.close();
    process.exit(1);
  }
});

server.listen(3333, () => {
  console.log('Servidor local ouvindo na porta 3333...');
});

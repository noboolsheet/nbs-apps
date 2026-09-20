import 'dotenv/config'
import { verifyMailer } from './lib/mailer.js'

/*
  Diagnostico: comprueba que el backend puede conectar y autenticar contra el
  SMTP de Gmail con la configuracion actual (.env). No envia ningun email.
  Uso: npm run smtp-check
*/
verifyMailer()
  .then(() => {
    console.log('OK: conexion y autenticacion SMTP correctas (smtp.gmail.com)')
    process.exit(0)
  })
  .catch((err) => {
    console.error('FALLO SMTP:', err.message)
    process.exit(1)
  })

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'RESEND_API_KEY',
  'CORS_ORIGIN',
  'FRONTEND_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BACKEND_URL', 
];

export function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Faltan variables de entorno requeridas:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Revisa tu archivo .env y asegúrate de incluir todas las variables.');
    process.exit(1); 
  }

  console.log('✅ Variables de entorno validadas correctamente');
}
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'RESEND_API_KEY',
  'CORS_ORIGIN',
  'FRONTEND_URL',
];

export function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Faltan variables de entorno requeridas:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Copia .env.example a .env y rellena los valores.');
    process.exit(1); 
  }

  console.log('✅ Variables de entorno validadas correctamente');
}
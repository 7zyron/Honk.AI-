const { execSync } = require('child_process');
try {
  execSync('curl -s -i -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -H "x-user-id: ip_127.0.0.1" -d \'{"model": "HONK", "messages": [{"role": "user", "content": "Hello"}]}\'', { stdio: 'inherit' });
} catch (e) {}

# SaaS CRM — Guia de instalação e execução

## Estrutura do projeto

```
saas-crm/
├── db/
│   └── schema.sql          # Schema PostgreSQL completo
├── backend/                # Node.js + Express
│   ├── server.js
│   ├── db/index.js
│   ├── middleware/auth.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── webhookController.js
│   │   ├── leadsController.js
│   │   └── ordersController.js
│   └── routes/
│       ├── auth.js
│       ├── leads.js
│       ├── orders.js
│       └── webhook.js
└── frontend/               # Next.js
    └── src/pages/
        ├── login.jsx
        ├── inbox.jsx
        └── funil.jsx
```

## 1. Banco de dados (PostgreSQL)

```bash
# Cria banco
createdb saas_crm

# Executa o schema
psql saas_crm < db/schema.sql
```

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # configure as variáveis abaixo
npm run dev
```

### Variáveis de ambiente (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/saas_crm
JWT_SECRET=coloque-uma-chave-forte-aqui
WA_VERIFY_TOKEN=token-do-webhook-whatsapp
PORT=3001
```

## 3. Frontend

```bash
cd frontend
npm install
# instala drag-and-drop
npm install react-beautiful-dnd
cp .env.local.example .env.local
npm run dev
```

### Variáveis de ambiente (.env.local)
```env
NEXT_PUBLIC_API=http://localhost:3001
```

## 4. Primeiros passos após subir

### Criar primeira empresa + admin
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Minha Empresa",
    "domain": "minha-empresa",
    "adminName": "Admin",
    "adminEmail": "admin@empresa.com",
    "adminPassword": "senha123"
  }'
```

### Fazer login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@empresa.com", "password": "senha123"}'
```

## Rotas do backend

| Método | Rota                         | Auth     | Descrição               |
|--------|------------------------------|----------|-------------------------|
| POST   | /auth/login                  | -        | Login                   |
| POST   | /auth/register               | -        | Cria empresa + admin    |
| GET    | /leads                       | qualquer | Lista leads             |
| POST   | /leads                       | qualquer | Cria lead               |
| PUT    | /leads/:id/stage             | qualquer | Move no kanban          |
| GET    | /orders                      | qualquer | Lista pedidos           |
| POST   | /orders                      | qualquer | Cria pedido             |
| GET    | /webhook/whatsapp            | -        | Verificação Meta        |
| POST   | /webhook/whatsapp            | -        | Recebe mensagens        |
| GET    | /:domain                     | -        | Loja pública            |

## Próximos passos

- [ ] Conectar WhatsApp Business API (Z-API, Evolution API ou Meta direta)
- [ ] Adicionar WebSocket para inbox em tempo real (Socket.io)
- [ ] Criar tela de estoque/produtos
- [ ] Dashboard de relatórios (admin)
- [ ] Adicionar IA para sugestão de resposta

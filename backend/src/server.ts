import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import authRoutes       from './routes/auth.routes'
import companyRoutes    from './routes/company.routes'
import userRoutes       from './routes/user.routes'
import customerRoutes   from './routes/customer.routes'
import conversationRoutes from './routes/conversation.routes'
import leadRoutes       from './routes/lead.routes'
import productRoutes    from './routes/product.routes'
import orderRoutes      from './routes/order.routes'
import settingsRoutes   from './routes/settings.routes'
import storeRoutes      from './routes/store.routes'
import webhookRoutes    from './webhooks/whatsapp.webhook'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// ─── Rotas públicas ───────────────────────────────────────────────────────────
app.use('/auth',        authRoutes)
app.use('/store',       storeRoutes)      // loja pública por domínio
app.use('/webhook',     webhookRoutes)    // webhooks externos

// ─── Rotas autenticadas ───────────────────────────────────────────────────────
app.use('/companies',   companyRoutes)
app.use('/users',       userRoutes)
app.use('/customers',   customerRoutes)
app.use('/conversations', conversationRoutes)
app.use('/leads',       leadRoutes)
app.use('/products',    productRoutes)
app.use('/orders',      orderRoutes)
app.use('/settings',    settingsRoutes)

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
})

export default app

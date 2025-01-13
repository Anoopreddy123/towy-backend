import express from 'express';
import cors from 'cors';
import 'reflect-metadata';
import { userRouter } from './routes/userRoutes';
import { AppDataSource } from './config/database';
import { serviceRouter } from './routes/serviceRoutes';
import { authRouter } from './routes/authRoutes';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://towy-ui.vercel.app',
        '*'  // Temporarily allow all origins for testing
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());
app.use('/api/users', userRouter);
app.use('/api/services', serviceRouter);
app.use('/api/auth', authRouter);

AppDataSource.initialize()
    .then(() => {
        console.log("Database connected");
    })
    .catch((error) => console.log(error));

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 
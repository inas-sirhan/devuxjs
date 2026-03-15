import dotenv from 'dotenv';

dotenv.config({
    path: `.env.${process.env.NODE_ENV}`,
    quiet: true,
});
dotenv.config({
    path: '.env',
    quiet: true,
});

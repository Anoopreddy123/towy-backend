import { simpleDbPool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

async function setupDatabase() {
    try {
        console.log('Setting up database...');
        
        // Read the SQL script
        const sqlPath = path.join(__dirname, 'setup-db.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // Split the SQL into individual statements
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);
        
        const client = await simpleDbPool.connect();
        
        try {
            for (const statement of statements) {
                if (statement.trim()) {
                    console.log('Executing:', statement.substring(0, 50) + '...');
                    await client.query(statement);
                }
            }
            
            console.log('Database setup completed successfully!');
            
            // Verify tables exist
            const tablesResult = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('users', 'service_requests')
            `);
            
            console.log('Created tables:', tablesResult.rows.map(row => row.table_name));
            
        } finally {
            client.release();
        }
        
    } catch (error: any) {
        console.error('Database setup failed:', error);
        throw error;
    }
}

// Run the setup if this file is executed directly
if (require.main === module) {
    setupDatabase()
        .then(() => {
            console.log('Setup completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Setup failed:', error);
            process.exit(1);
        });
}

export { setupDatabase }; 
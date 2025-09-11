"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDatabase = setupDatabase;
const database_1 = require("../config/database");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
        const client = await database_1.simpleDbPool.connect();
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
        }
        finally {
            client.release();
        }
    }
    catch (error) {
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

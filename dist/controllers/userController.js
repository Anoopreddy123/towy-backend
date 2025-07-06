"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.getUserById = exports.getAllUsers = void 0;
const database_1 = require("../config/database");
const getAllUsers = async (req, res) => {
    try {
        // Use direct database connection
        const client = await database_1.simpleDbPool.connect();
        try {
            const result = await client.query('SELECT id, name, email, role FROM users');
            res.json(result.rows);
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            error: "Database error. Please try again later."
        });
    }
};
exports.getAllUsers = getAllUsers;
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        // Use direct database connection
        const client = await database_1.simpleDbPool.connect();
        try {
            const result = await client.query('SELECT id, name, email, role FROM users WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: "User not found" });
                return;
            }
            res.json(result.rows[0]);
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            error: "Database error. Please try again later."
        });
    }
};
exports.getUserById = getUserById;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role } = req.body;
        // Use direct database connection
        const client = await database_1.simpleDbPool.connect();
        try {
            const result = await client.query('UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4 RETURNING id, name, email, role', [name, email, role, id]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: "User not found" });
                return;
            }
            res.json(result.rows[0]);
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            error: "Database error. Please try again later."
        });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Use direct database connection
        const client = await database_1.simpleDbPool.connect();
        try {
            const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
            if (result.rows.length === 0) {
                res.status(404).json({ error: "User not found" });
                return;
            }
            res.json({ message: "User deleted successfully" });
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            error: "Database error. Please try again later."
        });
    }
};
exports.deleteUser = deleteUser;

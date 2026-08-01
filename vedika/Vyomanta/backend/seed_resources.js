const path = require('path');
const mysql = require(require.resolve('mysql2/promise', { paths: [path.join(__dirname, '..', 'frontend')] }));
const fs = require('fs');
require(require.resolve('dotenv', { paths: [path.join(__dirname, '..', 'frontend')] })).config({ path: path.join(__dirname, '..', 'frontend', '.env') });

// Helper to parse a CSV line, respecting double quotes
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;
    
    const row = {};
    headers.forEach((header, index) => {
      let val = values[index];
      // strip enclosing quotes if present
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      row[header] = val;
    });
    rows.push(row);
  }
  return rows;
}

// Convert SQLite/Postgres style timestamps to MySQL format
function formatTimestamp(ts) {
  if (!ts || ts === 'None') return null;
  // If the timestamp has a timezone offset like +00, strip it
  let clean = ts.split('+')[0];
  return clean;
}

async function run() {
  console.log('Starting MariaDB seeding process...');
  
  // Connect to the MariaDB server (without specifying DB name first)
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  });
  
  try {
    // 1. Create database
    console.log('Creating database pdf_resources_db if it does not exist...');
    await connection.query('CREATE DATABASE IF NOT EXISTS pdf_resources_db');
    await connection.query('USE pdf_resources_db');

    // Drop existing tables and views to rebuild cleanly
    console.log('Dropping existing tables and views...');
    await connection.query('DROP VIEW IF EXISTS pdf_library_view');
    await connection.query('DROP TABLE IF EXISTS pdf_resources');
    await connection.query('DROP TABLE IF EXISTS pdf_categories');
    
    // 2. Create tables
    console.log('Creating tables...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pdf_categories (
        id VARCHAR(255) PRIMARY KEY,
        category VARCHAR(255) NOT NULL,
        subcategory VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pdf_resources (
        id VARCHAR(255) PRIMARY KEY,
        category_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        file_link TEXT NOT NULL,
        thumbnail TEXT NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (category_id) REFERENCES pdf_categories(id) ON DELETE CASCADE
      )
    `);
    
    // 3. Create view
    console.log('Creating library view...');
    await connection.query(`
      CREATE OR REPLACE VIEW pdf_library_view AS
      SELECT 
        r.id, 
        r.name, 
        r.file_link, 
        r.thumbnail, 
        r.created_at, 
        r.updated_at, 
        c.category, 
        c.subcategory, 
        r.category_id
      FROM pdf_resources r
      LEFT JOIN pdf_categories c ON r.category_id = c.id
    `);
    
    // 4. Seed categories
    console.log('Seeding categories...');
    const categoriesPath = path.join(__dirname, '..', 'pdf_categories_rows.csv');
    const categories = parseCSV(categoriesPath);
    console.log(`Parsed ${categories.length} categories from CSV.`);
    
    for (const cat of categories) {
      await connection.query(`
        INSERT INTO pdf_categories (id, category, subcategory, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          category = VALUES(category),
          subcategory = VALUES(subcategory),
          updated_at = VALUES(updated_at)
      `, [
        cat.id,
        cat.category,
        cat.subcategory,
        formatTimestamp(cat.created_at),
        formatTimestamp(cat.updated_at)
      ]);
    }
    console.log('Categories seeded successfully.');
    
    // 5. Seed resources
    console.log('Seeding resources...');
    const resourcesPath = path.join(__dirname, '..', 'pdf_resources_rows (1).csv');
    const resources = parseCSV(resourcesPath);
    console.log(`Parsed ${resources.length} resources from CSV.`);
    
    let resourceInsertCount = 0;
    for (const res of resources) {
      try {
        await connection.query(`
          INSERT INTO pdf_resources (id, category_id, name, file_link, thumbnail, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            category_id = VALUES(category_id),
            name = VALUES(name),
            file_link = VALUES(file_link),
            thumbnail = VALUES(thumbnail),
            updated_at = VALUES(updated_at)
        `, [
          res.id,
          res.category_id,
          res.name,
          res.file_link,
          res.thumbnail,
          formatTimestamp(res.created_at),
          formatTimestamp(res.updated_at)
        ]);
        resourceInsertCount++;
      } catch (err) {
        console.error(`Failed to insert resource ID: ${res.id}. Error: ${err.message}`);
      }
    }
    console.log(`Successfully seeded ${resourceInsertCount} resources.`);
    
    console.log('Database bootstrapping and seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await connection.end();
  }
}

run();

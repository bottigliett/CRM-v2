import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const dbPath = path.join(__dirname, '../../prisma/dev.db');
console.log(`📍 Using database: ${dbPath}`);

const db = new Database(dbPath, { readonly: true });

function escapeSql(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return value.toString();
  if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
    const dateStr = value instanceof Date ? value.toISOString() : value;
    return `'${dateStr.replace('T', ' ').substring(0, 19)}'`;
  }
  if (typeof value === 'string') {
    return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
  }
  return 'NULL';
}

async function exportAllData() {
  try {
    console.log('🔄 Starting FULL database export from SQLite to MySQL...\n');

    let sql = '-- Full Database Export from SQLite to MySQL\n';
    sql += '-- Generated: ' + new Date().toISOString() + '\n\n';
    sql += 'USE crm_dashboard;\n\n';
    sql += 'SET FOREIGN_KEY_CHECKS = 0;\n\n';

    // ========================================
    // USERS
    // ========================================
    console.log('📤 Exporting Users...');
    const users = db.prepare('SELECT * FROM users').all() as any[];

    if (users.length > 0) {
      sql += '-- Users\n';
      sql += 'TRUNCATE TABLE users;\n';

      for (const user of users) {
        const values = [
          escapeSql(user.username),
          escapeSql(user.email),
          escapeSql(user.email_verified),
          escapeSql(user.password),
          escapeSql(user.first_name),
          escapeSql(user.last_name),
          escapeSql(user.role),
          escapeSql(user.is_active),
          escapeSql(user.profile_image),
          escapeSql(user.last_login),
          escapeSql(user.theme),
          escapeSql(user.language),
          escapeSql(user.selected_theme),
          escapeSql(user.selected_tweakcn_theme),
          escapeSql(user.selected_radius),
          escapeSql(user.imported_theme_data),
          escapeSql(user.brand_colors),
          escapeSql(user.sidebar_variant),
          escapeSql(user.sidebar_collapsible),
          escapeSql(user.sidebar_side),
          escapeSql(user.created_at),
          escapeSql(user.updated_at)
        ].join(', ');

        sql += `INSERT INTO users (username, email, email_verified, password, first_name, last_name, role, is_active, profile_image, last_login, theme, language, selected_theme, selected_tweakcn_theme, selected_radius, imported_theme_data, brand_colors, sidebar_variant, sidebar_collapsible, sidebar_side, created_at, updated_at) VALUES (${values});\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${users.length} users exported`);
    }

    // ========================================
    // CONTACTS
    // ========================================
    console.log('📤 Exporting Contacts...');
    const contacts = db.prepare('SELECT * FROM contacts').all() as any[];

    if (contacts.length > 0) {
      sql += '-- Contacts\n';
      sql += 'TRUNCATE TABLE contact_custom_fields;\n';
      sql += 'TRUNCATE TABLE contact_socials;\n';
      sql += 'TRUNCATE TABLE contact_tags;\n';
      sql += 'TRUNCATE TABLE contacts;\n';

      for (const contact of contacts) {
        const values = [
          escapeSql(contact.name),
          escapeSql(contact.type),
          escapeSql(contact.contact_type),
          escapeSql(contact.email),
          escapeSql(contact.phone),
          escapeSql(contact.mobile),
          escapeSql(contact.address),
          escapeSql(contact.city),
          escapeSql(contact.province),
          escapeSql(contact.zip_code),
          escapeSql(contact.country),
          escapeSql(contact.partita_iva),
          escapeSql(contact.codice_fiscale),
          escapeSql(contact.website),
          escapeSql(contact.notes),
          escapeSql(contact.priority),
          escapeSql(contact.status),
          escapeSql(contact.funnel_stage),
          escapeSql(contact.funnel_value),
          escapeSql(contact.funnel_position),
          escapeSql(contact.lead_source),
          escapeSql(contact.service_type),
          escapeSql(contact.contact_date),
          escapeSql(contact.linked_contact_id),
          escapeSql(contact.created_at),
          escapeSql(contact.updated_at)
        ].join(', ');

        sql += `INSERT INTO contacts (name, type, contact_type, email, phone, mobile, address, city, province, zip_code, country, partita_iva, codice_fiscale, website, notes, priority, status, funnel_stage, funnel_value, funnel_position, lead_source, service_type, contact_date, linked_contact_id, created_at, updated_at) VALUES (${values});\n`;
        sql += `SET @contact_${contact.id} = LAST_INSERT_ID();\n`;
      }

      // Contact Tags
      const tags = db.prepare('SELECT * FROM contact_tags').all() as any[];
      for (const tag of tags) {
        sql += `INSERT INTO contact_tags (contact_id, tag, color, created_at) VALUES (@contact_${tag.contact_id}, ${escapeSql(tag.tag)}, ${escapeSql(tag.color)}, ${escapeSql(tag.created_at)});\n`;
      }

      // Contact Socials
      const socials = db.prepare('SELECT * FROM contact_socials').all() as any[];
      for (const social of socials) {
        sql += `INSERT INTO contact_socials (contact_id, platform, url, username, created_at) VALUES (@contact_${social.contact_id}, ${escapeSql(social.platform)}, ${escapeSql(social.url)}, ${escapeSql(social.username)}, ${escapeSql(social.created_at)});\n`;
      }

      // Contact Custom Fields
      const customFields = db.prepare('SELECT * FROM contact_custom_fields').all() as any[];
      for (const field of customFields) {
        sql += `INSERT INTO contact_custom_fields (contact_id, field_name, field_value, field_type, created_at, updated_at) VALUES (@contact_${field.contact_id}, ${escapeSql(field.field_name)}, ${escapeSql(field.field_value)}, ${escapeSql(field.field_type)}, ${escapeSql(field.created_at)}, ${escapeSql(field.updated_at)});\n`;
      }

      sql += '\n';
      console.log(`   ✅ ${contacts.length} contacts exported`);
    }

    // ========================================
    // LEAD FUNNEL STAGES
    // ========================================
    console.log('📤 Exporting Lead Funnel Stages...');
    const funnelStages = db.prepare('SELECT * FROM lead_funnel_stages').all() as any[];
    if (funnelStages.length > 0) {
      sql += '-- Lead Funnel Stages\n';
      sql += 'TRUNCATE TABLE lead_funnel_stages;\n';
      for (const stage of funnelStages) {
        const values = [
          escapeSql(stage.name),
          escapeSql(stage.order),
          escapeSql(stage.color),
          escapeSql(stage.created_at),
          escapeSql(stage.updated_at)
        ].join(', ');
        sql += `INSERT INTO lead_funnel_stages (name, \`order\`, color, created_at, updated_at) VALUES (${values});\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${funnelStages.length} funnel stages exported`);
    }

    // ========================================
    // TASK CATEGORIES
    // ========================================
    console.log('📤 Exporting Task Categories...');
    const taskCategories = db.prepare('SELECT * FROM task_categories').all() as any[];
    if (taskCategories.length > 0) {
      sql += '-- Task Categories\n';
      sql += 'TRUNCATE TABLE task_categories;\n';
      for (const category of taskCategories) {
        const values = [
          escapeSql(category.name),
          escapeSql(category.color),
          escapeSql(category.icon),
          escapeSql(category.is_active),
          escapeSql(category.created_at),
          escapeSql(category.updated_at)
        ].join(', ');
        sql += `INSERT INTO task_categories (name, color, icon, is_active, created_at, updated_at) VALUES (${values});\n`;
        sql += `SET @task_cat_${category.id} = LAST_INSERT_ID();\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${taskCategories.length} task categories exported`);
    }

    // ========================================
    // TASKS
    // ========================================
    console.log('📤 Exporting Tasks...');
    const tasks = db.prepare('SELECT * FROM tasks').all() as any[];

    if (tasks.length > 0) {
      sql += '-- Tasks\n';
      sql += 'TRUNCATE TABLE tasks;\n';
      for (const task of tasks) {
        const contactIdRef = task.client_id ? `@contact_${task.client_id}` : 'NULL';
        const categoryIdRef = `@task_cat_${task.category_id}`;

        // Get usernames for user references
        const assignedUser = db.prepare('SELECT username FROM users WHERE id = ?').get(task.assigned_to) as any;
        const createdUser = db.prepare('SELECT username FROM users WHERE id = ?').get(task.created_by) as any;

        const assignedToId = `(SELECT id FROM users WHERE username = ${escapeSql(assignedUser?.username)} LIMIT 1)`;
        const createdById = `(SELECT id FROM users WHERE username = ${escapeSql(createdUser?.username)} LIMIT 1)`;
        const updatedById = task.updated_by ? `(SELECT id FROM users WHERE id = ${task.updated_by} LIMIT 1)` : 'NULL';
        const archivedById = task.archived_by ? `(SELECT id FROM users WHERE id = ${task.archived_by} LIMIT 1)` : 'NULL';

        const values = [
          escapeSql(task.title),
          escapeSql(task.description),
          contactIdRef,
          categoryIdRef,
          assignedToId,
          createdById,
          escapeSql(task.priority),
          escapeSql(task.status),
          escapeSql(task.deadline),
          escapeSql(task.estimated_hours),
          escapeSql(task.actual_hours),
          escapeSql(task.completed_at),
          escapeSql(task.created_at),
          escapeSql(task.updated_at),
          updatedById,
          escapeSql(task.visible_to_client),
          escapeSql(task.is_archived),
          escapeSql(task.archived_at),
          archivedById,
          escapeSql(task.is_favorite)
        ].join(', ');

        sql += `INSERT INTO tasks (title, description, client_id, category_id, assigned_to, created_by, priority, status, deadline, estimated_hours, actual_hours, completed_at, created_at, updated_at, updated_by, visible_to_client, is_archived, archived_at, archived_by, is_favorite) VALUES (${values});\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${tasks.length} tasks exported`);
    }

    // Continue with other tables...
    // (Adding event categories, events, transactions, invoices, etc.)

    // ========================================
    // EVENT CATEGORIES
    // ========================================
    console.log('📤 Exporting Event Categories...');
    const eventCategories = db.prepare('SELECT * FROM event_categories').all() as any[];
    if (eventCategories.length > 0) {
      sql += '-- Event Categories\n';
      sql += 'TRUNCATE TABLE event_categories;\n';
      for (const category of eventCategories) {
        const values = [
          escapeSql(category.name),
          escapeSql(category.color),
          escapeSql(category.icon),
          escapeSql(category.is_active),
          escapeSql(category.created_at),
          escapeSql(category.updated_at)
        ].join(', ');
        sql += `INSERT INTO event_categories (name, color, icon, is_active, created_at, updated_at) VALUES (${values});\n`;
        sql += `SET @event_cat_${category.id} = LAST_INSERT_ID();\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${eventCategories.length} event categories exported`);
    }

    // ========================================
    // EVENTS
    // ========================================
    console.log('📤 Exporting Events...');
    const events = db.prepare('SELECT * FROM events').all() as any[];

    if (events.length > 0) {
      sql += '-- Events\n';
      sql += 'TRUNCATE TABLE event_reminders;\n';
      sql += 'TRUNCATE TABLE event_participants;\n';
      sql += 'TRUNCATE TABLE events;\n';

      for (const event of events) {
        const categoryIdRef = event.category_id ? `@event_cat_${event.category_id}` : 'NULL';
        const contactIdRef = event.contact_id ? `@contact_${event.contact_id}` : 'NULL';

        const assignedUser = event.assigned_to ? db.prepare('SELECT username FROM users WHERE id = ?').get(event.assigned_to) as any : null;
        const createdUser = db.prepare('SELECT username FROM users WHERE id = ?').get(event.created_by) as any;

        const assignedToId = assignedUser ? `(SELECT id FROM users WHERE username = ${escapeSql(assignedUser.username)} LIMIT 1)` : 'NULL';
        const createdById = `(SELECT id FROM users WHERE username = ${escapeSql(createdUser?.username)} LIMIT 1)`;

        const values = [
          escapeSql(event.title),
          escapeSql(event.description),
          escapeSql(event.start_datetime),
          escapeSql(event.end_datetime),
          categoryIdRef,
          contactIdRef,
          escapeSql(event.location),
          escapeSql(event.notes),
          escapeSql(event.status),
          escapeSql(event.color),
          escapeSql(event.is_all_day),
          escapeSql(event.visible_to_client),
          assignedToId,
          createdById,
          escapeSql(event.created_at),
          escapeSql(event.updated_at)
        ].join(', ');

        sql += `INSERT INTO events (title, description, start_datetime, end_datetime, category_id, contact_id, location, notes, status, color, is_all_day, visible_to_client, assigned_to, created_by, created_at, updated_at) VALUES (${values});\n`;
        sql += `SET @event_${event.id} = LAST_INSERT_ID();\n`;
      }

      // Event Participants
      const participants = db.prepare('SELECT * FROM event_participants').all() as any[];
      for (const participant of participants) {
        sql += `INSERT INTO event_participants (event_id, contact_id, status, notes, created_at) VALUES (@event_${participant.event_id}, @contact_${participant.contact_id}, ${escapeSql(participant.status)}, ${escapeSql(participant.notes)}, ${escapeSql(participant.created_at)});\n`;
      }

      // Event Reminders
      const reminders = db.prepare('SELECT * FROM event_reminders').all() as any[];
      for (const reminder of reminders) {
        const values = [
          `@event_${reminder.event_id}`,
          escapeSql(reminder.reminder_type),
          escapeSql(reminder.send_email),
          escapeSql(reminder.email_sent),
          escapeSql(reminder.email_sent_at),
          escapeSql(reminder.send_browser),
          escapeSql(reminder.browser_sent),
          escapeSql(reminder.browser_sent_at),
          escapeSql(reminder.scheduled_at),
          escapeSql(reminder.created_at)
        ].join(', ');
        sql += `INSERT INTO event_reminders (event_id, reminder_type, send_email, email_sent, email_sent_at, send_browser, browser_sent, browser_sent_at, scheduled_at, created_at) VALUES (${values});\n`;
      }

      sql += '\n';
      console.log(`   ✅ ${events.length} events exported`);
    }

    // ========================================
    // TRANSACTION CATEGORIES
    // ========================================
    console.log('📤 Exporting Transaction Categories...');
    const transactionCategories = db.prepare('SELECT * FROM transaction_categories').all() as any[];
    if (transactionCategories.length > 0) {
      sql += '-- Transaction Categories\n';
      sql += 'TRUNCATE TABLE transaction_categories;\n';
      for (const category of transactionCategories) {
        const values = [
          escapeSql(category.name),
          escapeSql(category.type),
          escapeSql(category.icon),
          escapeSql(category.color),
          escapeSql(category.is_active),
          escapeSql(category.created_at),
          escapeSql(category.updated_at)
        ].join(', ');
        sql += `INSERT INTO transaction_categories (name, type, icon, color, is_active, created_at, updated_at) VALUES (${values});\n`;
        sql += `SET @trans_cat_${category.id} = LAST_INSERT_ID();\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${transactionCategories.length} transaction categories exported`);
    }

    // ========================================
    // PAYMENT METHODS
    // ========================================
    console.log('📤 Exporting Payment Methods...');
    const paymentMethods = db.prepare('SELECT * FROM payment_methods').all() as any[];
    if (paymentMethods.length > 0) {
      sql += '-- Payment Methods\n';
      sql += 'TRUNCATE TABLE payment_methods;\n';
      for (const method of paymentMethods) {
        const values = [
          escapeSql(method.name),
          escapeSql(method.is_active),
          escapeSql(method.created_at),
          escapeSql(method.updated_at)
        ].join(', ');
        sql += `INSERT INTO payment_methods (name, is_active, created_at, updated_at) VALUES (${values});\n`;
        sql += `SET @payment_${method.id} = LAST_INSERT_ID();\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${paymentMethods.length} payment methods exported`);
    }

    // ========================================
    // INVOICES
    // ========================================
    console.log('📤 Exporting Invoices...');
    const invoices = db.prepare('SELECT * FROM invoices').all() as any[];

    if (invoices.length > 0) {
      sql += '-- Invoices\n';
      sql += 'TRUNCATE TABLE invoice_items;\n';
      sql += 'TRUNCATE TABLE invoices;\n';

      for (const invoice of invoices) {
        const contactIdRef = invoice.contact_id ? `@contact_${invoice.contact_id}` : 'NULL';
        const createdUser = db.prepare('SELECT username FROM users WHERE id = ?').get(invoice.created_by) as any;
        const createdById = `(SELECT id FROM users WHERE username = ${escapeSql(createdUser?.username)} LIMIT 1)`;

        const values = [
          escapeSql(invoice.invoice_number),
          contactIdRef,
          escapeSql(invoice.client_name),
          escapeSql(invoice.client_address),
          escapeSql(invoice.client_piva),
          escapeSql(invoice.client_cf),
          escapeSql(invoice.subject),
          escapeSql(invoice.description),
          escapeSql(invoice.quote_id),
          escapeSql(invoice.quantity),
          escapeSql(invoice.unit_price),
          escapeSql(invoice.subtotal),
          escapeSql(invoice.vat_percentage),
          escapeSql(invoice.vat_amount),
          escapeSql(invoice.total),
          escapeSql(invoice.issue_date),
          escapeSql(invoice.due_date),
          escapeSql(invoice.payment_days),
          escapeSql(invoice.status),
          escapeSql(invoice.payment_date),
          escapeSql(invoice.payment_method),
          escapeSql(invoice.payment_notes),
          escapeSql(invoice.tax_reserved),
          escapeSql(invoice.tax_amount),
          escapeSql(invoice.fiscal_notes),
          escapeSql(invoice.pdf_path),
          escapeSql(invoice.pdf_generated_at),
          createdById,
          escapeSql(invoice.created_at),
          escapeSql(invoice.updated_at)
        ].join(', ');

        sql += `INSERT INTO invoices (invoice_number, contact_id, client_name, client_address, client_piva, client_cf, subject, description, quote_id, quantity, unit_price, subtotal, vat_percentage, vat_amount, total, issue_date, due_date, payment_days, status, payment_date, payment_method, payment_notes, tax_reserved, tax_amount, fiscal_notes, pdf_path, pdf_generated_at, created_by, created_at, updated_at) VALUES (${values});\n`;
        sql += `SET @invoice_${invoice.id} = LAST_INSERT_ID();\n`;
      }

      // Invoice Items
      const invoiceItems = db.prepare('SELECT * FROM invoice_items').all() as any[];
      for (const item of invoiceItems) {
        const values = [
          `@invoice_${item.invoice_id}`,
          escapeSql(item.description),
          escapeSql(item.quantity),
          escapeSql(item.unit_price),
          escapeSql(item.vat_percentage),
          escapeSql(item.amount),
          escapeSql(item.order),
          escapeSql(item.created_at),
          escapeSql(item.updated_at)
        ].join(', ');
        sql += `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, vat_percentage, amount, \`order\`, created_at, updated_at) VALUES (${values});\n`;
      }

      sql += '\n';
      console.log(`   ✅ ${invoices.length} invoices exported`);
    }

    // ========================================
    // TRANSACTIONS
    // ========================================
    console.log('📤 Exporting Transactions...');
    const transactions = db.prepare('SELECT * FROM transactions').all() as any[];

    if (transactions.length > 0) {
      sql += '-- Transactions\n';
      sql += 'TRUNCATE TABLE transactions;\n';
      for (const transaction of transactions) {
        const categoryIdRef = transaction.category_id ? `@trans_cat_${transaction.category_id}` : 'NULL';
        const paymentIdRef = transaction.payment_method_id ? `@payment_${transaction.payment_method_id}` : 'NULL';
        const contactIdRef = transaction.contact_id ? `@contact_${transaction.contact_id}` : 'NULL';
        const invoiceIdRef = transaction.invoice_id ? `@invoice_${transaction.invoice_id}` : 'NULL';

        const createdUser = db.prepare('SELECT username FROM users WHERE id = ?').get(transaction.created_by) as any;
        const createdById = `(SELECT id FROM users WHERE username = ${escapeSql(createdUser?.username)} LIMIT 1)`;

        const values = [
          escapeSql(transaction.type),
          escapeSql(transaction.amount),
          escapeSql(transaction.date),
          categoryIdRef,
          paymentIdRef,
          contactIdRef,
          escapeSql(transaction.description),
          invoiceIdRef,
          createdById,
          escapeSql(transaction.created_at),
          escapeSql(transaction.updated_at)
        ].join(', ');

        sql += `INSERT INTO transactions (type, amount, date, category_id, payment_method_id, contact_id, description, invoice_id, created_by, created_at, updated_at) VALUES (${values});\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${transactions.length} transactions exported`);
    }

    sql += 'SET FOREIGN_KEY_CHECKS = 1;\n\n';
    sql += '-- Export completed!\n';

    // Write to file
    const outputPath = path.join(__dirname, '../../full-database-export.sql');
    fs.writeFileSync(outputPath, sql);

    console.log('\n✅ Full export completed!');
    console.log(`📁 SQL file saved to: ${outputPath}`);
    console.log('\n📋 Next steps:');
    console.log('1. Copy the SQL file to your server:');
    console.log('   scp backend/full-database-export.sql root@185.229.236.196:/tmp/');
    console.log('2. On the server, run:');
    console.log('   mysql -u crm_user -p crm_dashboard < /tmp/full-database-export.sql');

  } catch (error) {
    console.error('❌ Error during export:', error);
  } finally {
    db.close();
  }
}

exportAllData();

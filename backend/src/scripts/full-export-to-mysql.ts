import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL as LibSQLAdapter } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// This script uses your local SQLite database
// Create LibSQL client for local SQLite file
const dbPath = path.join(__dirname, '../../prisma/dev.db');
console.log(`📍 Using database: ${dbPath}`);

const libsql = createClient({
  url: `file:${dbPath}`
});

const adapter = LibSQLAdapter(libsql);
const prisma = new PrismaClient({ adapter });

function escapeSql(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return value.toString();
  if (value instanceof Date) return `'${value.toISOString().replace('T', ' ').substring(0, 19)}'`;
  if (typeof value === 'string') {
    // Escape single quotes and backslashes
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
    const users = await prisma.user.findMany();
    if (users.length > 0) {
      sql += '-- Users\n';
      sql += 'TRUNCATE TABLE users;\n';
      for (const user of users) {
        const values = [
          escapeSql(user.username),
          escapeSql(user.email),
          escapeSql(user.emailVerified),
          escapeSql(user.password),
          escapeSql(user.firstName),
          escapeSql(user.lastName),
          escapeSql(user.role),
          escapeSql(user.isActive),
          escapeSql(user.profileImage),
          escapeSql(user.lastLogin),
          escapeSql(user.theme),
          escapeSql(user.language),
          escapeSql(user.selectedTheme),
          escapeSql(user.selectedTweakcnTheme),
          escapeSql(user.selectedRadius),
          escapeSql(user.importedThemeData),
          escapeSql(user.brandColors),
          escapeSql(user.sidebarVariant),
          escapeSql(user.sidebarCollapsible),
          escapeSql(user.sidebarSide),
          escapeSql(user.createdAt),
          escapeSql(user.updatedAt)
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
    const contacts = await prisma.contact.findMany({
      include: {
        tags: true,
        socials: true,
        customFields: true
      }
    });

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
          escapeSql(contact.contactType),
          escapeSql(contact.email),
          escapeSql(contact.phone),
          escapeSql(contact.mobile),
          escapeSql(contact.address),
          escapeSql(contact.city),
          escapeSql(contact.province),
          escapeSql(contact.zipCode),
          escapeSql(contact.country),
          escapeSql(contact.partitaIva),
          escapeSql(contact.codiceFiscale),
          escapeSql(contact.website),
          escapeSql(contact.notes),
          escapeSql(contact.priority),
          escapeSql(contact.status),
          escapeSql(contact.funnelStage),
          escapeSql(contact.funnelValue),
          escapeSql(contact.funnelPosition),
          escapeSql(contact.leadSource),
          escapeSql(contact.serviceType),
          escapeSql(contact.contactDate),
          escapeSql(contact.linkedContactId),
          escapeSql(contact.createdAt),
          escapeSql(contact.updatedAt)
        ].join(', ');

        sql += `INSERT INTO contacts (name, type, contact_type, email, phone, mobile, address, city, province, zip_code, country, partita_iva, codice_fiscale, website, notes, priority, status, funnel_stage, funnel_value, funnel_position, lead_source, service_type, contact_date, linked_contact_id, created_at, updated_at) VALUES (${values});\n`;

        // Contact Tags
        for (const tag of contact.tags) {
          const tagValues = [
            `(SELECT id FROM contacts WHERE email = ${escapeSql(contact.email)} LIMIT 1)`,
            escapeSql(tag.tag),
            escapeSql(tag.color),
            escapeSql(tag.createdAt)
          ].join(', ');
          sql += `INSERT INTO contact_tags (contact_id, tag, color, created_at) VALUES (${tagValues});\n`;
        }

        // Contact Socials
        for (const social of contact.socials) {
          const socialValues = [
            `(SELECT id FROM contacts WHERE email = ${escapeSql(contact.email)} LIMIT 1)`,
            escapeSql(social.platform),
            escapeSql(social.url),
            escapeSql(social.username),
            escapeSql(social.createdAt)
          ].join(', ');
          sql += `INSERT INTO contact_socials (contact_id, platform, url, username, created_at) VALUES (${socialValues});\n`;
        }

        // Contact Custom Fields
        for (const field of contact.customFields) {
          const fieldValues = [
            `(SELECT id FROM contacts WHERE email = ${escapeSql(contact.email)} LIMIT 1)`,
            escapeSql(field.fieldName),
            escapeSql(field.fieldValue),
            escapeSql(field.fieldType),
            escapeSql(field.createdAt),
            escapeSql(field.updatedAt)
          ].join(', ');
          sql += `INSERT INTO contact_custom_fields (contact_id, field_name, field_value, field_type, created_at, updated_at) VALUES (${fieldValues});\n`;
        }
      }
      sql += '\n';
      console.log(`   ✅ ${contacts.length} contacts exported`);
    }

    // ========================================
    // LEAD FUNNEL STAGES
    // ========================================
    console.log('📤 Exporting Lead Funnel Stages...');
    const funnelStages = await prisma.leadFunnelStage.findMany();
    if (funnelStages.length > 0) {
      sql += '-- Lead Funnel Stages\n';
      sql += 'TRUNCATE TABLE lead_funnel_stages;\n';
      for (const stage of funnelStages) {
        const values = [
          escapeSql(stage.name),
          escapeSql(stage.order),
          escapeSql(stage.color),
          escapeSql(stage.createdAt),
          escapeSql(stage.updatedAt)
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
    const taskCategories = await prisma.taskCategory.findMany();
    if (taskCategories.length > 0) {
      sql += '-- Task Categories\n';
      sql += 'TRUNCATE TABLE task_categories;\n';
      for (const category of taskCategories) {
        const values = [
          escapeSql(category.name),
          escapeSql(category.color),
          escapeSql(category.icon),
          escapeSql(category.isActive),
          escapeSql(category.createdAt),
          escapeSql(category.updatedAt)
        ].join(', ');
        sql += `INSERT INTO task_categories (name, color, icon, is_active, created_at, updated_at) VALUES (${values});\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${taskCategories.length} task categories exported`);
    }

    // ========================================
    // TASKS
    // ========================================
    console.log('📤 Exporting Tasks...');
    const tasks = await prisma.task.findMany({
      include: {
        contact: true,
        category: true,
        assignedUser: true,
        creator: true
      }
    });

    if (tasks.length > 0) {
      sql += '-- Tasks\n';
      sql += 'TRUNCATE TABLE tasks;\n';
      for (const task of tasks) {
        // Get user IDs
        const assignedToId = `(SELECT id FROM users WHERE username = ${escapeSql(task.assignedUser.username)} LIMIT 1)`;
        const createdById = `(SELECT id FROM users WHERE username = ${escapeSql(task.creator.username)} LIMIT 1)`;
        const contactId = task.contact ? `(SELECT id FROM contacts WHERE email = ${escapeSql(task.contact.email)} LIMIT 1)` : 'NULL';
        const categoryId = `(SELECT id FROM task_categories WHERE name = ${escapeSql(task.category.name)} LIMIT 1)`;
        const updatedById = task.updatedBy ? `(SELECT id FROM users WHERE id = ${task.updatedBy} LIMIT 1)` : 'NULL';
        const archivedById = task.archivedBy ? `(SELECT id FROM users WHERE id = ${task.archivedBy} LIMIT 1)` : 'NULL';

        const values = [
          escapeSql(task.title),
          escapeSql(task.description),
          contactId,
          categoryId,
          assignedToId,
          createdById,
          escapeSql(task.priority),
          escapeSql(task.status),
          escapeSql(task.deadline),
          escapeSql(task.estimatedHours),
          escapeSql(task.actualHours),
          escapeSql(task.completedAt),
          escapeSql(task.createdAt),
          escapeSql(task.updatedAt),
          updatedById,
          escapeSql(task.visibleToClient),
          escapeSql(task.isArchived),
          escapeSql(task.archivedAt),
          archivedById,
          escapeSql(task.isFavorite)
        ].join(', ');

        sql += `INSERT INTO tasks (title, description, client_id, category_id, assigned_to, created_by, priority, status, deadline, estimated_hours, actual_hours, completed_at, created_at, updated_at, updated_by, visible_to_client, is_archived, archived_at, archived_by, is_favorite) VALUES (${values});\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${tasks.length} tasks exported`);
    }

    // ========================================
    // EVENT CATEGORIES
    // ========================================
    console.log('📤 Exporting Event Categories...');
    const eventCategories = await prisma.eventCategory.findMany();
    if (eventCategories.length > 0) {
      sql += '-- Event Categories\n';
      sql += 'TRUNCATE TABLE event_categories;\n';
      for (const category of eventCategories) {
        const values = [
          escapeSql(category.name),
          escapeSql(category.color),
          escapeSql(category.icon),
          escapeSql(category.isActive),
          escapeSql(category.createdAt),
          escapeSql(category.updatedAt)
        ].join(', ');
        sql += `INSERT INTO event_categories (name, color, icon, is_active, created_at, updated_at) VALUES (${values});\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${eventCategories.length} event categories exported`);
    }

    // ========================================
    // EVENTS
    // ========================================
    console.log('📤 Exporting Events...');
    const events = await prisma.event.findMany({
      include: {
        category: true,
        contact: true,
        assignedUser: true,
        createdUser: true,
        participants: {
          include: {
            contact: true
          }
        },
        reminders: true
      }
    });

    if (events.length > 0) {
      sql += '-- Events\n';
      sql += 'TRUNCATE TABLE event_reminders;\n';
      sql += 'TRUNCATE TABLE event_participants;\n';
      sql += 'TRUNCATE TABLE events;\n';

      for (const event of events) {
        const categoryId = event.category ? `(SELECT id FROM event_categories WHERE name = ${escapeSql(event.category.name)} LIMIT 1)` : 'NULL';
        const contactId = event.contact ? `(SELECT id FROM contacts WHERE email = ${escapeSql(event.contact.email)} LIMIT 1)` : 'NULL';
        const assignedToId = event.assignedUser ? `(SELECT id FROM users WHERE username = ${escapeSql(event.assignedUser.username)} LIMIT 1)` : 'NULL';
        const createdById = `(SELECT id FROM users WHERE username = ${escapeSql(event.createdUser.username)} LIMIT 1)`;

        const values = [
          escapeSql(event.title),
          escapeSql(event.description),
          escapeSql(event.startDateTime),
          escapeSql(event.endDateTime),
          categoryId,
          contactId,
          escapeSql(event.location),
          escapeSql(event.notes),
          escapeSql(event.status),
          escapeSql(event.color),
          escapeSql(event.isAllDay),
          escapeSql(event.visibleToClient),
          assignedToId,
          createdById,
          escapeSql(event.createdAt),
          escapeSql(event.updatedAt)
        ].join(', ');

        sql += `INSERT INTO events (title, description, start_datetime, end_datetime, category_id, contact_id, location, notes, status, color, is_all_day, visible_to_client, assigned_to, created_by, created_at, updated_at) VALUES (${values});\n`;

        // Set a variable for the last inserted event ID
        sql += `SET @last_event_id = LAST_INSERT_ID();\n`;

        // Event Participants
        for (const participant of event.participants) {
          const participantContactId = `(SELECT id FROM contacts WHERE email = ${escapeSql(participant.contact.email)} LIMIT 1)`;
          const participantValues = [
            '@last_event_id',
            participantContactId,
            escapeSql(participant.status),
            escapeSql(participant.notes),
            escapeSql(participant.createdAt)
          ].join(', ');
          sql += `INSERT INTO event_participants (event_id, contact_id, status, notes, created_at) VALUES (${participantValues});\n`;
        }

        // Event Reminders
        for (const reminder of event.reminders) {
          const reminderValues = [
            '@last_event_id',
            escapeSql(reminder.reminderType),
            escapeSql(reminder.sendEmail),
            escapeSql(reminder.emailSent),
            escapeSql(reminder.emailSentAt),
            escapeSql(reminder.sendBrowser),
            escapeSql(reminder.browserSent),
            escapeSql(reminder.browserSentAt),
            escapeSql(reminder.scheduledAt),
            escapeSql(reminder.createdAt)
          ].join(', ');
          sql += `INSERT INTO event_reminders (event_id, reminder_type, send_email, email_sent, email_sent_at, send_browser, browser_sent, browser_sent_at, scheduled_at, created_at) VALUES (${reminderValues});\n`;
        }
      }
      sql += '\n';
      console.log(`   ✅ ${events.length} events exported`);
    }

    // ========================================
    // TRANSACTION CATEGORIES
    // ========================================
    console.log('📤 Exporting Transaction Categories...');
    const transactionCategories = await prisma.transactionCategory.findMany();
    if (transactionCategories.length > 0) {
      sql += '-- Transaction Categories\n';
      sql += 'TRUNCATE TABLE transaction_categories;\n';
      for (const category of transactionCategories) {
        const values = [
          escapeSql(category.name),
          escapeSql(category.type),
          escapeSql(category.icon),
          escapeSql(category.color),
          escapeSql(category.isActive),
          escapeSql(category.createdAt),
          escapeSql(category.updatedAt)
        ].join(', ');
        sql += `INSERT INTO transaction_categories (name, type, icon, color, is_active, created_at, updated_at) VALUES (${values});\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${transactionCategories.length} transaction categories exported`);
    }

    // ========================================
    // PAYMENT METHODS
    // ========================================
    console.log('📤 Exporting Payment Methods...');
    const paymentMethods = await prisma.paymentMethod.findMany();
    if (paymentMethods.length > 0) {
      sql += '-- Payment Methods\n';
      sql += 'TRUNCATE TABLE payment_methods;\n';
      for (const method of paymentMethods) {
        const values = [
          escapeSql(method.name),
          escapeSql(method.isActive),
          escapeSql(method.createdAt),
          escapeSql(method.updatedAt)
        ].join(', ');
        sql += `INSERT INTO payment_methods (name, is_active, created_at, updated_at) VALUES (${values});\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${paymentMethods.length} payment methods exported`);
    }

    // ========================================
    // INVOICES
    // ========================================
    console.log('📤 Exporting Invoices...');
    const invoices = await prisma.invoice.findMany({
      include: {
        contact: true,
        creator: true,
        items: true
      }
    });

    if (invoices.length > 0) {
      sql += '-- Invoices\n';
      sql += 'TRUNCATE TABLE invoice_items;\n';
      sql += 'TRUNCATE TABLE invoices;\n';

      for (const invoice of invoices) {
        const contactId = invoice.contact ? `(SELECT id FROM contacts WHERE email = ${escapeSql(invoice.contact.email)} LIMIT 1)` : 'NULL';
        const createdById = `(SELECT id FROM users WHERE username = ${escapeSql(invoice.creator.username)} LIMIT 1)`;

        const values = [
          escapeSql(invoice.invoiceNumber),
          contactId,
          escapeSql(invoice.clientName),
          escapeSql(invoice.clientAddress),
          escapeSql(invoice.clientPIva),
          escapeSql(invoice.clientCF),
          escapeSql(invoice.subject),
          escapeSql(invoice.description),
          escapeSql(invoice.quoteId),
          escapeSql(invoice.quantity),
          escapeSql(invoice.unitPrice),
          escapeSql(invoice.subtotal),
          escapeSql(invoice.vatPercentage),
          escapeSql(invoice.vatAmount),
          escapeSql(invoice.total),
          escapeSql(invoice.issueDate),
          escapeSql(invoice.dueDate),
          escapeSql(invoice.paymentDays),
          escapeSql(invoice.status),
          escapeSql(invoice.paymentDate),
          escapeSql(invoice.paymentMethod),
          escapeSql(invoice.paymentNotes),
          escapeSql(invoice.taxReserved),
          escapeSql(invoice.taxAmount),
          escapeSql(invoice.fiscalNotes),
          escapeSql(invoice.pdfPath),
          escapeSql(invoice.pdfGeneratedAt),
          createdById,
          escapeSql(invoice.createdAt),
          escapeSql(invoice.updatedAt)
        ].join(', ');

        sql += `INSERT INTO invoices (invoice_number, contact_id, client_name, client_address, client_piva, client_cf, subject, description, quote_id, quantity, unit_price, subtotal, vat_percentage, vat_amount, total, issue_date, due_date, payment_days, status, payment_date, payment_method, payment_notes, tax_reserved, tax_amount, fiscal_notes, pdf_path, pdf_generated_at, created_by, created_at, updated_at) VALUES (${values});\n`;

        // Set a variable for the last inserted invoice ID
        sql += `SET @last_invoice_id = LAST_INSERT_ID();\n`;

        // Invoice Items
        for (const item of invoice.items) {
          const itemValues = [
            '@last_invoice_id',
            escapeSql(item.description),
            escapeSql(item.quantity),
            escapeSql(item.unitPrice),
            escapeSql(item.vatPercentage),
            escapeSql(item.amount),
            escapeSql(item.order),
            escapeSql(item.createdAt),
            escapeSql(item.updatedAt)
          ].join(', ');
          sql += `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, vat_percentage, amount, \`order\`, created_at, updated_at) VALUES (${itemValues});\n`;
        }
      }
      sql += '\n';
      console.log(`   ✅ ${invoices.length} invoices exported`);
    }

    // ========================================
    // TRANSACTIONS
    // ========================================
    console.log('📤 Exporting Transactions...');
    const transactions = await prisma.transaction.findMany({
      include: {
        category: true,
        paymentMethod: true,
        contact: true,
        creator: true,
        invoice: true
      }
    });

    if (transactions.length > 0) {
      sql += '-- Transactions\n';
      sql += 'TRUNCATE TABLE transactions;\n';
      for (const transaction of transactions) {
        const categoryId = transaction.category ? `(SELECT id FROM transaction_categories WHERE name = ${escapeSql(transaction.category.name)} LIMIT 1)` : 'NULL';
        const paymentMethodId = transaction.paymentMethod ? `(SELECT id FROM payment_methods WHERE name = ${escapeSql(transaction.paymentMethod.name)} LIMIT 1)` : 'NULL';
        const contactId = transaction.contact ? `(SELECT id FROM contacts WHERE email = ${escapeSql(transaction.contact.email)} LIMIT 1)` : 'NULL';
        const invoiceId = transaction.invoice ? `(SELECT id FROM invoices WHERE invoice_number = ${escapeSql(transaction.invoice.invoiceNumber)} LIMIT 1)` : 'NULL';
        const createdById = `(SELECT id FROM users WHERE username = ${escapeSql(transaction.creator.username)} LIMIT 1)`;

        const values = [
          escapeSql(transaction.type),
          escapeSql(transaction.amount),
          escapeSql(transaction.date),
          categoryId,
          paymentMethodId,
          contactId,
          escapeSql(transaction.description),
          invoiceId,
          createdById,
          escapeSql(transaction.createdAt),
          escapeSql(transaction.updatedAt)
        ].join(', ');

        sql += `INSERT INTO transactions (type, amount, date, category_id, payment_method_id, contact_id, description, invoice_id, created_by, created_at, updated_at) VALUES (${values});\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${transactions.length} transactions exported`);
    }

    // ========================================
    // USER PERMISSIONS
    // ========================================
    console.log('📤 Exporting User Permissions...');
    const permissions = await prisma.userPermission.findMany({
      include: {
        user: true
      }
    });

    if (permissions.length > 0) {
      sql += '-- User Permissions\n';
      sql += 'TRUNCATE TABLE user_permissions;\n';
      for (const perm of permissions) {
        const userId = `(SELECT id FROM users WHERE username = ${escapeSql(perm.user.username)} LIMIT 1)`;
        const values = [
          userId,
          escapeSql(perm.moduleName),
          escapeSql(perm.hasAccess)
        ].join(', ');
        sql += `INSERT INTO user_permissions (user_id, module_name, has_access) VALUES (${values});\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${permissions.length} user permissions exported`);
    }

    // ========================================
    // NOTIFICATIONS
    // ========================================
    console.log('📤 Exporting Notifications...');
    const notifications = await prisma.notification.findMany({
      include: {
        user: true
      }
    });

    if (notifications.length > 0) {
      sql += '-- Notifications\n';
      sql += 'TRUNCATE TABLE notifications;\n';
      for (const notif of notifications) {
        const userId = `(SELECT id FROM users WHERE username = ${escapeSql(notif.user.username)} LIMIT 1)`;
        const values = [
          userId,
          escapeSql(notif.type),
          escapeSql(notif.title),
          escapeSql(notif.message),
          escapeSql(notif.link),
          escapeSql(notif.isRead),
          escapeSql(notif.readAt),
          escapeSql(notif.eventId),
          escapeSql(notif.taskId),
          escapeSql(notif.metadata),
          escapeSql(notif.createdAt)
        ].join(', ');
        sql += `INSERT INTO notifications (user_id, type, title, message, link, is_read, read_at, event_id, task_id, metadata, created_at) VALUES (${values});\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${notifications.length} notifications exported`);
    }

    // ========================================
    // NOTIFICATION PREFERENCES
    // ========================================
    console.log('📤 Exporting Notification Preferences...');
    const notifPrefs = await prisma.notificationPreference.findMany({
      include: {
        user: true
      }
    });

    if (notifPrefs.length > 0) {
      sql += '-- Notification Preferences\n';
      sql += 'TRUNCATE TABLE notification_preferences;\n';
      for (const pref of notifPrefs) {
        const userId = `(SELECT id FROM users WHERE username = ${escapeSql(pref.user.username)} LIMIT 1)`;
        const values = [
          userId,
          escapeSql(pref.emailEnabled),
          escapeSql(pref.emailEventReminder),
          escapeSql(pref.emailEventAssigned),
          escapeSql(pref.emailTaskAssigned),
          escapeSql(pref.emailTaskDueSoon),
          escapeSql(pref.emailTaskOverdue),
          escapeSql(pref.browserEnabled),
          escapeSql(pref.browserEventReminder),
          escapeSql(pref.browserEventAssigned),
          escapeSql(pref.browserTaskAssigned),
          escapeSql(pref.browserTaskDueSoon),
          escapeSql(pref.browserTaskOverdue),
          escapeSql(pref.centerEnabled),
          escapeSql(pref.defaultReminderEnabled),
          escapeSql(pref.defaultReminderType),
          escapeSql(pref.createdAt),
          escapeSql(pref.updatedAt)
        ].join(', ');
        sql += `INSERT INTO notification_preferences (user_id, email_enabled, email_event_reminder, email_event_assigned, email_task_assigned, email_task_due_soon, email_task_overdue, browser_enabled, browser_event_reminder, browser_event_assigned, browser_task_assigned, browser_task_due_soon, browser_task_overdue, center_enabled, default_reminder_enabled, default_reminder_type, created_at, updated_at) VALUES (${values});\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${notifPrefs.length} notification preferences exported`);
    }

    // ========================================
    // CALENDAR PREFERENCES
    // ========================================
    console.log('📤 Exporting Calendar Preferences...');
    const calPrefs = await prisma.calendarPreference.findMany({
      include: {
        user: true
      }
    });

    if (calPrefs.length > 0) {
      sql += '-- Calendar Preferences\n';
      sql += 'TRUNCATE TABLE calendar_preferences;\n';
      for (const pref of calPrefs) {
        const userId = `(SELECT id FROM users WHERE username = ${escapeSql(pref.user.username)} LIMIT 1)`;
        const values = [
          userId,
          escapeSql(pref.defaultView),
          escapeSql(pref.defaultStartHour),
          escapeSql(pref.defaultEndHour),
          escapeSql(pref.favoriteCategories),
          escapeSql(pref.showWeekends),
          escapeSql(pref.defaultEventDuration),
          escapeSql(pref.hideSidebar),
          escapeSql(pref.createdAt),
          escapeSql(pref.updatedAt)
        ].join(', ');
        sql += `INSERT INTO calendar_preferences (user_id, default_view, default_start_hour, default_end_hour, favorite_categories, show_weekends, default_event_duration, hide_sidebar, created_at, updated_at) VALUES (${values});\n`;
      }
      sql += '\n';
      console.log(`   ✅ ${calPrefs.length} calendar preferences exported`);
    }

    sql += 'SET FOREIGN_KEY_CHECKS = 1;\n\n';
    sql += '-- Export completed!\n';

    // Write to file
    const outputPath = '/Users/davide/Documents/shadcn-dashboard/backend/full-database-export.sql';
    fs.writeFileSync(outputPath, sql);

    console.log('\n✅ Full export completed!');
    console.log(`📁 SQL file saved to: ${outputPath}`);
    console.log('\n📋 Next steps:');
    console.log('1. Copy the SQL file to your server');
    console.log('2. Run: mysql -u crm_user -p crm_dashboard < full-database-export.sql');

  } catch (error) {
    console.error('❌ Error during export:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportAllData();

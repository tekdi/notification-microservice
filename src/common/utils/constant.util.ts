export const SUCCESS_MESSAGES = {
    NOTIFICATION_COMPLETED: 'Notification process completed',
    SEND_NOTIFICATION: '/send Notification',
    NOTIFICATION_QUEUE_SAVE_SUCCESSFULLY: 'Notification saved in queue successfully',
    NOTIFICATION_SENT_SUCCESSFULLY: 'Notification sent successfully',
    PUSH_NOTIFICATION_SEND_SUCCESSFULLY: 'Push notification sent successfully',
    TEMPLATE_CREATE: 'Template created successfully',
    TEMPLATE_UPDATE: 'Template updated successfully',
    TEMPLATE_DELETE: 'Template delete successfully',
    TEMPLATE_GET: 'Template get successfully',
    CREATE_TEMPLATE_API: '/create Template for Notification',
    UPDATE_TEMPLATE_API: '/Update Template for Notification',
    TEMPLATE_DELETE_ID: (actionId) => `Template id: ${actionId} deleted successfully.`,
    TEMPLATE_LIST: 'Get template list',
    CREATED: 'Created',
    QUEUE_UPDATED: 'Updated Sucessfully',
    QUEUE_LIST: 'Get Records from queue',
    SAVE_NOTIFICATION_LOG: '/save Notification Log',
    EMAIL_NOTIFICATION_SEND_SUCCESSFULLY: 'Email notification sent successfully',
    SMS_NOTIFICATION_SEND_SUCCESSFULLY: 'SMS notification sent successfully',
    TEMPLATE_CREATED_SUCESSFULLY: (userId) => `Template created successfully by userId: ${userId}`,
    GET_TEMPLATE: (userId) => `Get Template successfully by userId: ${userId}`,
    DELETE_TEMPLATE: (userId) => `Delete Template successfully by userId: ${userId}`,
    MESSAGES_SAVING_IN_QUEUE: 'Notification saving in queue'
};
export const ERROR_MESSAGES = {
    INVALID_REQUEST: "Invalid request",
    NOT_FOUND: "Not found",
    UNAUTHORIZED: "Unauthorized",
    FORBIDDEN: "Forbidden",
    BAD_REQUEST: "Bad request",
    INVALID_REQUEST_BODY: "Invalid request body",
    INTERNAL_SERVER_ERROR: "Internal Server Error",
    TEMPLATE_NOTFOUND: 'Template not found',
    NOTIFICATION_FAILED: `Failed to Send Notification`,
    TEMPLATE_CONFIG_NOTFOUND: 'Template Config not found for this context: ',
    NOTIFICATION_QUEUE_SAVE_FAILED: 'Failed to save notifications in queue',
    NOTIFICATION_LOG_SAVE_FAILED: 'Failed to save Log of notification',
    TOPIC_NOTIFICATION_FAILED: 'Failed to send topic notification',
    PUSH_NOTIFICATION_FAILED: 'Failed to send push notification',
    TEMPLATE_ALREADY_EXIST: 'Template already exist',
    TEMPLATE_NOT_EXIST: 'Template not exist',
    TEMPLATE_NOT_DELETED: 'Template not deleted',
    TEMPLATE_ID_NOTFOUND: (template_id) => `No template id found: ${template_id}`,
    QUEUE_NOTFOUND: 'No data found in queue',
    QUEUE_UPDATE: (id) => `No notification queue found for:${id}`,
    EVENT_UPDATE_FAILED: 'Event update failed',
    USERID_REQUIRED: 'User ID is required',
    USERID_UUID: 'The userId should not be empty and must be valid UUID',
    NOTIFICATION_SAVE_ERROR_IN_RABBITMQ: '/error to save in notification in rabbitMq',
    NOTIFICATION_SEND_FAILED: (topic_name) => `Failed to Send Notification for this:  ${topic_name} topic`,
    INVALID_EMAIL: 'Invalid Email ID or Request Format',
    EMAIL_NOTIFICATION_FAILED: 'Failed to Send Email Notification for',
    INVALID_MOBILE_NUMBER: 'invalid Mobile Number',
    SMS_NOTIFICATION_FAILED: 'Failed to Send SMS Notification',
    ALREADY_EXIST_KEY_FOR_CONTEXT: 'Already Exist key with this context',
    ALREADY_EXIST_KEY_FOR_CONTEXT_ENTER_ANOTHER: 'Key already exist for this context. Please enter another key',
    NOT_EMPTY_SUBJECT_OR_BODY: 'Subject and body cannot be empty.'
}

export const SMS_PROVIDER = {
    TWILIO: 'TWILIO',
    AWS_SNS: 'AWSSNS',
    MSG_91: 'MSG91',
}
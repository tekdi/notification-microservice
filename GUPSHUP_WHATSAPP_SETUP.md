# Gupshup WhatsApp API Setup Guide

This guide explains how to set up WhatsApp messaging using Gupshup API integration for your notification microservice.

## Prerequisites

1. **Gupshup Account**: You need a verified Gupshup account
2. **WhatsApp Business API Access**: Apply for WhatsApp Business API access through Gupshup
3. **Verified Phone Number**: Your WhatsApp Business phone number must be verified
4. **Channel Setup**: Create a WhatsApp channel in your Gupshup account

## Environment Variables Required

Add these environment variables to your `.env` file:

```env
# Gupshup WhatsApp API Configuration
GUPSHUP_API_KEY=your_gupshup_api_key_here
GUPSHUP_CHANNEL_ID=your_whatsapp_channel_id_here
GUPSHUP_SOURCE=your_whatsapp_source_number_here
GUPSHUP_API_URL=https://api.gupshup.io/wa/api/v1

# Optional: Your WhatsApp Business Phone Number (for display purposes)
WHATSAPP_FROM=+1234567890
```

## How to Get Gupshup WhatsApp API Credentials

### 1. Gupshup Account Setup
1. Go to [Gupshup](https://www.gupshup.io/) and create an account
2. Complete the verification process for your business
3. Apply for WhatsApp Business API access

### 2. WhatsApp Channel Setup
1. In your Gupshup dashboard, go to "Channels" > "WhatsApp"
2. Create a new WhatsApp channel
3. Follow the setup process to connect your WhatsApp Business number
4. Get your channel ID from the channel settings

### 3. Get Your API Credentials
1. **API Key**: 
   - Go to your Gupshup dashboard
   - Navigate to "API Keys" or "Developer Settings"
   - Generate a new API key with appropriate permissions

2. **Channel ID**:
   - In your WhatsApp channel settings
   - Copy the Channel ID (it's a unique identifier)

3. **Source Number**:
   - This is your verified WhatsApp Business phone number
   - Format: +1234567890 (with country code)

## API Features Implemented

The Gupshup WhatsApp adapter supports:

1. **Text Messages**: Send plain text messages
2. **Template Messages**: Send pre-approved message templates
3. **Error Handling**: Comprehensive error handling for API failures
4. **Logging**: All message attempts are logged for tracking
5. **Phone Number Validation**: Ensures proper international format

## Message Format

The API expects phone numbers in international format:
- ✅ `+1234567890`
- ❌ `1234567890` (missing +)
- ❌ `+1-234-567-890` (with dashes)

## Usage Examples

### 1. Send Raw Text Message

```typescript
// Send a raw WhatsApp message
const messageData = {
  to: '+1234567890',
  body: 'Hello from Gupshup WhatsApp API!'
};

const result = await whatsappViaGupshupAdapter.sendRawMessages(messageData);
```

### 2. Send Template Message

```typescript
// Send a template message
const templateData = {
  to: '+1234567890',
  templateId: 'your_template_id',
  templateParams: ['param1', 'param2'],
  from: '+1234567890'
};

const result = await whatsappViaGupshupAdapter.sendTemplateMessage(templateData);
```

### 3. Send Multiple Messages

```typescript
// Send multiple messages
const messages = [
  { to: '+1234567890', body: 'Message 1' },
  { to: '+0987654321', body: 'Message 2' }
];

const results = await whatsappViaGupshupAdapter.sendRawMessages(messages);
```

## API Endpoints Used

The adapter uses the following Gupshup API endpoints:

- **Send Message**: `POST https://api.gupshup.io/wa/api/v1/msg`
- **Headers Required**:
  - `apikey`: Your Gupshup API key
  - `Content-Type`: application/json
  - `Cache-Control`: no-cache

## Message Payload Structure

### Text Message
```json
{
  "channelId": "your_channel_id",
  "source": "your_source_number",
  "destination": "recipient_number",
  "message": {
    "type": "text",
    "text": "Your message here"
  }
}
```

### Template Message
```json
{
  "channelId": "your_channel_id",
  "source": "your_source_number",
  "destination": "recipient_number",
  "message": {
    "type": "template",
    "template": {
      "id": "template_id",
      "params": ["param1", "param2"]
    }
  }
}
```

## Common Error Codes

- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Invalid API key
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Channel or template not found
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Gupshup server error

## Response Format

### Success Response
```json
{
  "status": "submitted",
  "messageId": "unique_message_id",
  "details": {
    "channelId": "channel_id",
    "destination": "recipient_number"
  }
}
```

### Error Response
```json
{
  "status": "error",
  "error": "Error description",
  "details": {
    "code": "error_code",
    "message": "Detailed error message"
  }
}
```

## Rate Limits

Gupshup has rate limits on message sending:
- **Standard Plan**: 1000 messages per hour
- **Premium Plan**: Higher limits based on your plan
- **Template Messages**: May have different rate limits

## Important Notes

1. **Message Templates**: For business use cases, you need pre-approved message templates
2. **Rate Limits**: Monitor your message sending rate to avoid hitting limits
3. **Webhooks**: Consider setting up webhooks for delivery receipts
4. **Testing**: Use Gupshup's test environment before going live
5. **Phone Number Format**: Always use international format with country code

## Troubleshooting

1. **"Credentials not configured"**: Check your environment variables
2. **"Invalid phone number"**: Ensure phone numbers are in international format
3. **"API Error"**: Check your API key and channel ID
4. **"Rate limit exceeded"**: Reduce message sending frequency
5. **"Template not found"**: Verify template ID and approval status

## Security Considerations

1. Never commit your API keys to version control
2. Use environment variables for all sensitive data
3. Regularly rotate your API keys
4. Monitor API usage and set up alerts for unusual activity
5. Use HTTPS for all API communications

## Integration with Notification Service

To use this adapter in your notification service:

1. Import the adapter in your module
2. Add it to your provider list
3. Configure environment variables
4. Use the adapter methods in your service

```typescript
// In your notification module
import { WhatsappViaGupshupAdapter } from './adapters/whatsappViaGupshup.adapter';

@Module({
  providers: [
    WhatsappViaGupshupAdapter,
    // ... other providers
  ],
})
export class NotificationModule {}
```

## Support

For technical support:
- Gupshup Documentation: https://www.gupshup.io/developer/docs
- Gupshup Support: Contact through your Gupshup dashboard
- API Status: Check Gupshup's status page for any service issues 
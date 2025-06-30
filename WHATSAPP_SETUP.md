# WhatsApp Business API Setup Guide

This guide explains how to set up WhatsApp Business API integration for sending messages directly through WhatsApp's official API.

## Prerequisites

1. **Meta Business Manager Account**: You need a verified business account
2. **WhatsApp Business API Access**: Apply for WhatsApp Business API access
3. **Verified Phone Number**: Your WhatsApp Business phone number must be verified

## Environment Variables Required

Add these environment variables to your `.env` file:

```env
# WhatsApp Business API Configuration
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_API_VERSION=v18.0
WHATSAPP_FROM=+1234567890
```

## How to Get WhatsApp Business API Credentials

### 1. Meta Business Manager Setup
1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Create or access your business account
3. Ensure your business is verified

### 2. WhatsApp Business API Setup
1. In Meta Business Manager, go to "All Tools" > "WhatsApp" > "Getting Started"
2. Follow the setup process to get API access
3. Create a WhatsApp Business app
4. Add a phone number to your WhatsApp Business account

### 3. Get Your Credentials
1. **Access Token**: 
   - Go to your WhatsApp Business app in Meta Business Manager
   - Navigate to "System Users" or "Access Tokens"
   - Generate a new access token with appropriate permissions

2. **Phone Number ID**:
   - In your WhatsApp Business app, go to "Phone Numbers"
   - Select your verified phone number
   - Copy the Phone Number ID (it's a long number)

## API Features Implemented

The WhatsApp adapter now supports:

1. **Text Messages**: Send plain text messages
2. **Template Messages**: Send pre-approved message templates
3. **Error Handling**: Comprehensive error handling for API failures
4. **Logging**: All message attempts are logged for tracking

## Message Format

The API expects phone numbers in international format:
- ✅ `+1234567890`
- ❌ `1234567890` (missing +)
- ❌ `+1-234-567-890` (with dashes)

## Usage Example

```typescript
// Send a raw WhatsApp message
const messageData = {
  to: '+1234567890',
  body: 'Hello from WhatsApp Business API!'
};

const result = await whatsappAdapter.sendRawMessages(messageData);
```

## Common Error Codes

- `100`: Invalid phone number format
- `131`: Message template not found
- `132`: Message template rejected
- `133`: Message template expired
- `134`: Message template not approved

## Important Notes

1. **Message Templates**: For most business use cases, you need pre-approved message templates
2. **Rate Limits**: WhatsApp has rate limits on message sending
3. **Webhooks**: Consider setting up webhooks for delivery receipts
4. **Testing**: Use WhatsApp's test environment before going live

## Troubleshooting

1. **"Credentials not configured"**: Check your environment variables
2. **"Invalid phone number"**: Ensure phone numbers are in international format
3. **"API Error"**: Check your access token and phone number ID
4. **"Network error"**: Check your internet connection and firewall settings

## Security Considerations

1. Never commit your access tokens to version control
2. Use environment variables for all sensitive data
3. Regularly rotate your access tokens
4. Monitor API usage and set up alerts for unusual activity 
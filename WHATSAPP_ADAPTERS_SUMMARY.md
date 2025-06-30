# WhatsApp Adapters Summary

This document provides an overview of the two WhatsApp adapters available in the notification microservice and how to choose between them.

## Available WhatsApp Adapters

### 1. Meta WhatsApp Business API Adapter (`whatsappService.adapter.ts`)
- **Provider**: Direct integration with Meta's WhatsApp Business API
- **File**: `src/modules/notification/adapters/whatsappService.adapter.ts`
- **Setup Guide**: `WHATSAPP_SETUP.md`

### 2. Gupshup WhatsApp API Adapter (`whatsappViaGupshup.adapter.ts`)
- **Provider**: Integration via Gupshup's WhatsApp Business API
- **File**: `src/modules/notification/adapters/whatsappViaGupshup.adapter.ts`
- **Setup Guide**: `GUPSHUP_WHATSAPP_SETUP.md`

## Choosing Between Adapters

### Use Meta WhatsApp Business API Adapter When:
- ✅ You have direct access to Meta Business Manager
- ✅ Your business is verified with Meta
- ✅ You want direct control over your WhatsApp Business API
- ✅ You need the most up-to-date WhatsApp features
- ✅ You have a large volume of messages

### Use Gupshup WhatsApp API Adapter When:
- ✅ You prefer a managed service provider
- ✅ You want easier setup and maintenance
- ✅ You need additional messaging features beyond WhatsApp
- ✅ You want better customer support
- ✅ You prefer a unified dashboard for multiple messaging channels

## Environment Configuration

### For Meta WhatsApp Business API:
```env
WHATSAPP_PROVIDER=META
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_API_VERSION=v18.0
WHATSAPP_FROM=+1234567890
```

### For Gupshup WhatsApp API:
```env
WHATSAPP_PROVIDER=GUPSHUP
GUPSHUP_API_KEY=your_gupshup_api_key_here
GUPSHUP_CHANNEL_ID=your_whatsapp_channel_id_here
GUPSHUP_SOURCE=your_whatsapp_source_number_here
GUPSHUP_API_URL=https://api.gupshup.io/wa/api/v1
WHATSAPP_FROM=+1234567890
```

## Usage Examples

### Using the Adapter Factory (Recommended)

```typescript
// The factory automatically chooses the correct adapter based on WHATSAPP_PROVIDER
const whatsappAdapter = this.notificationAdapterFactory.getAdapter('whatsapp');

// Send a message
const result = await whatsappAdapter.sendRawMessages({
  to: '+1234567890',
  body: 'Hello from WhatsApp!'
});
```

### Using Specific Adapters

```typescript
// For Meta WhatsApp API
const metaWhatsappAdapter = this.whatsappAdapter;
const result1 = await metaWhatsappAdapter.sendRawMessages(messageData);

// For Gupshup WhatsApp API
const gupshupWhatsappAdapter = this.whatsappViaGupshupAdapter;
const result2 = await gupshupWhatsappAdapter.sendRawMessages(messageData);
```

### Using the Factory with Specific Provider

```typescript
// Get specific WhatsApp adapter
const whatsappAdapter = this.notificationAdapterFactory.getWhatsappAdapter('GUPSHUP');
const result = await whatsappAdapter.sendRawMessages(messageData);
```

## Feature Comparison

| Feature | Meta WhatsApp API | Gupshup WhatsApp API |
|---------|------------------|---------------------|
| **Setup Complexity** | High | Medium |
| **Business Verification** | Required | Managed by Gupshup |
| **Message Templates** | ✅ | ✅ |
| **Text Messages** | ✅ | ✅ |
| **Media Messages** | ✅ | ✅ |
| **Webhook Support** | ✅ | ✅ |
| **Rate Limits** | Meta controlled | Gupshup managed |
| **Customer Support** | Limited | Dedicated support |
| **Additional Channels** | WhatsApp only | Multiple channels |
| **Dashboard** | Meta Business Manager | Gupshup Dashboard |

## Migration Between Adapters

To switch between adapters:

1. **Update Environment Variables**:
   ```env
   # Change from META to GUPSHUP or vice versa
   WHATSAPP_PROVIDER=GUPSHUP
   ```

2. **Update Credentials**:
   - For Meta: Set `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`
   - For Gupshup: Set `GUPSHUP_API_KEY`, `GUPSHUP_CHANNEL_ID`, and `GUPSHUP_SOURCE`

3. **Test the Integration**:
   ```typescript
   const result = await this.notificationAdapterFactory
     .getAdapter('whatsapp')
     .sendRawMessages({
       to: '+1234567890',
       body: 'Test message'
     });
   ```

## Error Handling

Both adapters provide comprehensive error handling:

```typescript
try {
  const result = await whatsappAdapter.sendRawMessages(messageData);
  if (result.status === 'success') {
    console.log('Message sent successfully');
  } else {
    console.error('Message failed:', result.errors);
  }
} catch (error) {
  console.error('Adapter error:', error);
}
```

## Logging

Both adapters log all message attempts to the `notification_logs` table with:
- Message content
- Recipient information
- Success/failure status
- Error details (if any)
- Timestamp

## Best Practices

1. **Environment Variables**: Always use environment variables for sensitive data
2. **Error Handling**: Implement proper error handling for failed messages
3. **Rate Limiting**: Monitor and respect rate limits
4. **Testing**: Test with a small number of messages before going live
5. **Monitoring**: Set up monitoring for message delivery rates
6. **Backup**: Consider having both adapters configured for redundancy

## Support

- **Meta WhatsApp API**: Check Meta's developer documentation
- **Gupshup WhatsApp API**: Contact Gupshup support through their dashboard
- **Code Issues**: Check the respective setup guides for troubleshooting

## Next Steps

1. Choose your preferred WhatsApp provider
2. Follow the corresponding setup guide
3. Configure environment variables
4. Test the integration
5. Monitor message delivery and performance 
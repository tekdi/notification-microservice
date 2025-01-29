{
    "routes": [
        {
            "sourceRoute": "/interface/v1/notification-templates",
            "type": "POST",
            "priority": "MUST_HAVE",
            "inSequence": false,
            "orchestrated": false,
            "targetPackages": [
                {
                    "basePackageName": "notification",
                    "packageName": "shiksha-notification"
                }
            ]
        },
        {
            "sourceRoute": "/interface/v1/notification-templates/list",
            "type": "POST",
            "priority": "MUST_HAVE",
            "inSequence": false,
            "orchestrated": false,
            "targetPackages": [
                {
                    "basePackageName": "notification",
                    "packageName": "shiksha-notification"
                }
            ]
        },
        {
            "sourceRoute": "/interface/v1/notification-templates/:id",
            "type": "PATCH",
            "priority": "MUST_HAVE",
            "inSequence": false,
            "orchestrated": false,
            "targetPackages": [
                {
                    "basePackageName": "notification",
                    "packageName": "shiksha-notification"
                }
            ]
        },
        {
            "sourceRoute": "/interface/v1/notification-templates/:id",
            "type": "DELETE",
            "priority": "MUST_HAVE",
            "inSequence": false,
            "orchestrated": false,
            "targetPackages": [
                {
                    "basePackageName": "notification",
                    "packageName": "shiksha-notification"
                }
            ]
        },
        {
            "sourceRoute": "/interface/v1/notification/send",
            "type": "POST",
            "priority": "MUST_HAVE",
            "inSequence": false,
            "orchestrated": false,
            "targetPackages": [
                {
                    "basePackageName": "notification",
                    "packageName": "shiksha-notification"
                }
            ]
        },
        {
            "sourceRoute": "/interface/v1/queue",
            "type": "POST",
            "priority": "MUST_HAVE",
            "inSequence": false,
            "orchestrated": false,
            "targetPackages": [
                {
                    "basePackageName": "notification",
                    "packageName": "shiksha-notification"
                }
            ]
        },
        {
            "sourceRoute": "/interface/v1/queue/list",
            "type": "POST",
            "priority": "MUST_HAVE",
            "inSequence": false,
            "orchestrated": false,
            "targetPackages": [
                {
                    "basePackageName": "notification",
                    "packageName": "shiksha-notification"
                }
            ]
        },
        {
            "sourceRoute": "/interface/v1/queue/:id",
            "type": "PATCH",
            "priority": "MUST_HAVE",
            "inSequence": false,
            "orchestrated": false,
            "targetPackages": [
                {
                    "basePackageName": "notification",
                    "packageName": "shiksha-notification"
                }
            ]
        }
    ]
}
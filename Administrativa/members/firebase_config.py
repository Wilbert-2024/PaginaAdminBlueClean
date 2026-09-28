from pathlib import Path

import firebase_admin
from django.conf import settings
from firebase_admin import credentials, firestore


CREDENTIALS_FILE = (
    Path(settings.BASE_DIR).parent
    / "prueva-c32c2-firebase-adminsdk-fbsvc-c8a85c01ed.json"
)

if not firebase_admin._apps:
    credential = credentials.Certificate(str(CREDENTIALS_FILE))
    firebase_admin.initialize_app(credential)


db = firestore.client()
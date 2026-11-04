import os
import sys
from pathlib import Path

os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-2")
os.environ.setdefault("TABLE_NAME", "test-table")
os.environ.setdefault("ALERTS_TOPIC_ARN", "arn:aws:sns:us-east-2:000000000000:test")
os.environ.setdefault("BEDROCK_MODEL_ID", "test-model")

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

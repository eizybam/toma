"""Renders the Toma architecture diagram with the official AWS icons.

    pip install diagrams        # also needs Graphviz (`dot`) on the PATH
    python architecture.py      # writes architecture.png

Solid lines are deployed today (backend/template.yaml). Dashed lines are planned.
"""
from diagrams import Cluster, Diagram, Edge
from diagrams.aws.compute import Lambda
from diagrams.aws.database import Dynamodb
from diagrams.aws.integration import Eventbridge, SNS
from diagrams.aws.ml import Bedrock
from diagrams.aws.network import APIGateway, CloudFront
from diagrams.aws.storage import S3
from diagrams.generic.device import Mobile
from diagrams.onprem.client import User

GRAPH = {"fontsize": "20", "pad": "0.5", "nodesep": "1.0", "ranksep": "1.4", "splines": "spline"}
PLANNED = {"style": "dashed", "color": "gray"}

with Diagram(
    "Toma - architecture (us-east-2)",
    filename="architecture",
    outformat="png",
    show=False,
    direction="LR",
    graph_attr=GRAPH,
):
    patient = Mobile("Patient phone\n(taps NFC tag ST25TV02KC)")
    caregiver = User("Caregiver\n(dashboard + alerts)")

    with Cluster("Planned frontend (Vite + React)"):
        cdn = CloudFront("CloudFront")
        site = S3("Static site")

    with Cluster("AWS Cloud - SAM stack toma-backend"):
        api_gw = APIGateway("API Gateway\nHTTP API\n(throttled, CORS)")

        with Cluster("Lambda (Python 3.13, arm64)"):
            web = Lambda("web\nGET /  /demo  /t/{tagId}  /p/{pid}")
            api = Lambda("api\nPOST /tap, patients, meds,\nprescriptions/parse, demo/seed")
            checker = Lambda("checker\nmissed doses")

        table = Dynamodb("DynamoDB\nsingle table pk/sk")
        scheduler = Eventbridge("EventBridge Scheduler\nrate(1 minute)")
        topic = SNS("SNS topic\ntoma-alertas")
        bedrock = Bedrock("Bedrock\nNova 2 Lite (vision)")

    patient >> Edge(label="1. tap: GET /t/{tagId}?c=counter") >> api_gw
    caregiver >> Edge(label="GET /p/{pid}, polls every 5 s") >> api_gw

    api_gw >> web
    api_gw >> Edge(label="2. POST /tap") >> api

    api >> Edge(label="3. validate counter,\nrecord dose") >> table
    api >> Edge(label="duplicate dose alert") >> topic
    api >> Edge(label="prescription photo") >> bedrock

    scheduler >> Edge(label="every minute") >> checker
    checker >> Edge(label="find missed slots") >> table
    checker >> Edge(label="missed dose alert") >> topic

    topic >> Edge(label="email (optional AlertEmail)") >> caregiver

    site >> Edge(**PLANNED) >> cdn
    cdn >> Edge(label="planned", **PLANNED) >> api_gw

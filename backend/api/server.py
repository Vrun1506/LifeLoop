from flask import Flask, request, jsonify, Response
import boto3
import os

app = Flask(__name__)

# --- Cloudflare R2 / S3 Configuration ---
# Ideally these are environment variables:
# export AWS_ACCESS_KEY_ID="xxx"
# export AWS_SECRET_ACCESS_KEY="xxx"
# export R2_ENDPOINT_URL="https://<accountid>.r2.cloudflarestorage.com"
# export R2_BUCKET_NAME="my-bucket"

s3 = boto3.client(
    "s3",
    endpoint_url=os.getenv("R2_ENDPOINT_URL"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)

BUCKET_NAME = os.getenv("R2_BUCKET_NAME")


@app.route('/hello', methods=['GET'])
def hello():
    return jsonify({"message": "Hello, world!"})


@app.route('/echo', methods=['POST'])
def echo():
    data = request.get_json()
    return jsonify({"you_sent": data})


@app.route('/transcribe-image', methods=['POST'])
def transcribe_image():
    """
    Expected input JSON:
    {
      "filename": "image_name_in_bucket.png"
    }
    """
    try:
        data = request.get_json()
        filename = data.get("filename")

        if not filename:
            return jsonify({"error": "Missing 'filename' field"}), 400

        # Fetch image bytes from Cloudflare R2
        obj = s3.get_object(Bucket=BUCKET_NAME, Key=filename)
        img_bytes = obj["Body"].read()

        # Get the MIME type if stored, otherwise default to jpeg
        content_type = obj.get("ContentType", "image/jpeg")

        # Return raw image data to the caller (useful if your next step is OCR/AI processing)
        return Response(img_bytes, mimetype=content_type)

    except s3.exceptions.NoSuchKey:
        return jsonify({"error": "Image not found in bucket"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Run the server
if __name__ == '__main__':
    app.run(debug=True, port=5000)

import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const s3 = new S3Client({});

async function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

export const handler = async (event: any) => {
  const bucketName = process.env.SUBJECTS_BUCKET;
  if (!bucketName) {
    console.error("SUBJECTS_BUCKET is not set");
    return { statusCode: 500, body: "Server configuration error" };
  }

  const subject = event.queryStringParameters?.subject;

  try {
    if (!subject) {
      // List all objects under quiz-content/ and return their base names without extension
      const listResp = await s3.send(
        new ListObjectsV2Command({ Bucket: bucketName, Prefix: "quiz-content/" })
      );

      const subjects = (listResp.Contents || [])
        .map((o) => o.Key)
        .filter((k): k is string => !!k)
        .map((k) => k.replace(/^quiz-content\//, "").replace(/\.json$/, ""));

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjects),
      };
    }

    const result = await s3.send(
      new GetObjectCommand({
        Bucket: bucketName,
        // quizzes are deployed to the QuizBucket under the prefix `quiz-content/`
        Key: `quiz-content/${subject}.json`,
      })
    );

    const body = await streamToString(result.Body as Readable);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body,
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Error fetching subject questions" };
  }
};

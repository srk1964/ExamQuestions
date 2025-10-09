import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
const s3 = new S3Client({});

export const handler = async () => {
  const bucketName = process.env.QUIZ_BUCKET!;
  const prefix = "quiz-content/";
  const res = await s3.send(new ListObjectsV2Command({ Bucket: bucketName, Prefix: prefix }));
  const subjects = (res.Contents || [])
    .map(o => o.Key?.replace(prefix, "").replace(".json", ""))
    .filter(Boolean);
  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(subjects) };
};

import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3 = new S3Client({});

export const handler = async () => {
  const bucketName = process.env.SUBJECTS_BUCKET!;
  const prefix = "subjects/";

  try {
    const result = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
      })
    );

    const subjects =
      result.Contents?.map(obj =>
        obj.Key?.replace(prefix, "").replace(".json", "")
      ).filter(Boolean) || [];

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subjects),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Error listing subjects" };
  }
};

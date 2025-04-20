import { Box, TableCell, TableRow, Skeleton } from "@mui/material";
import { Query } from "appwrite";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function CertificateRow({
  email,
  name,
  hour,
  listId,
  appwriteDatabases,
}) {
  const [certificateId, setCertificateId] = useState("----------------");
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCertificate = async () => {
      try {
        const response = await appwriteDatabases.listDocuments(
          "sam-core",
          "certificates",
          [
            Query.equal("email_list_id", listId),
            Query.equal("email", email),
            Query.equal("name", name),
            Query.equal("hour", hour),
          ]
        );
        if (response.total > 0) {
          const certificate = response.documents[0];
          setCertificateId(certificate.certificate_id);
          setEmailSent(certificate.email_sent);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching certificate:", error);
        setIsLoading(false);
      }
    };
    fetchCertificate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TableRow>
      <TableCell>{email}</TableCell>
      <TableCell>{name}</TableCell>
      <TableCell>{hour}</TableCell>
      <TableCell>
        {isLoading ? (
          <Skeleton animation="wave" width={120} />
        ) : certificateId === "----------------" ? (
          <span style={{ color: "red" }}>Not Generated</span>
        ) : (
          <Link
            to={`https://fra.cloud.appwrite.io/v1/storage/buckets/certificates/files/${certificateId.replace(
              "/",
              "-"
            )}/view?project=social-action-mobilizer`}
            target="_blank"
          >
            {certificateId}
          </Link>
        )}
      </TableCell>
      <TableCell>
        {isLoading ? (
          <Skeleton animation="wave" width={80} />
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {emailSent ? (
              <span style={{ color: "green" }}>Sent</span>
            ) : (
              <span style={{ color: "red" }}>Not Sent</span>
            )}
          </Box>
        )}
      </TableCell>
    </TableRow>
  );
}

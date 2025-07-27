import { Box, TableCell, Skeleton } from "@mui/material";
import { Query } from "appwrite";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function CertificateRow({
  email,
  name,
  college,
  hour,
  listId,
  appwriteDatabases,
  index, // Add index prop
}) {
  const [certificateId, setCertificateId] = useState("----------------");
  const [certificateLink, setCertificateLink] = useState(null);
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
          ]
        );
        if (response.total > 0) {
          const certificate = response.documents[0];
          setCertificateId(certificate.certificate_id);
          setEmailSent(certificate.email_sent);
          setCertificateLink(certificate.certificateLink);
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
    <>
      <TableCell>{index + 1}</TableCell>
      <TableCell>{email}</TableCell>
      <TableCell>{name}</TableCell>
      <TableCell>
        {college && college.trim() !== "" ? college : "--------"}
      </TableCell>
      <TableCell>{hour}</TableCell>
      <TableCell>
        {isLoading ? (
          <Skeleton animation="wave" width={120} />
        ) : certificateId === "----------------" ? (
          <span style={{ color: "red" }}>Not Generated</span>
        ) : certificateLink ? (
          <Link to={certificateLink} target="_blank">
            {certificateId}
          </Link>
        ) : (
          <>{certificateId}</>
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
    </>
  );
}

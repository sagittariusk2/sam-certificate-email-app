import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Alert,
  Snackbar,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import { useEffect, useState } from "react";
import SendIcon from "@mui/icons-material/Send";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ReplayIcon from "@mui/icons-material/Replay";
import WorkIcon from "@mui/icons-material/Work";
import { Client, Databases, Functions } from "appwrite";
import CertificateRow from "../components/CertificateRow";
import PendingIcon from "@mui/icons-material/Pending";

const appwriteClient = new Client()
  .setEndpoint("https://cloud.appwrite.io/v1")
  .setProject("social-action-mobilizer");
const appwriteDatabases = new Databases(appwriteClient);
const appwriteFunctions = new Functions(appwriteClient);

const db = "sam-core";
const collection = {
  emailLists: "email-lists",
  certificates: "certificates",
};

const listStatus = {
  DRAFT: "DRAFT",
  CERTIFICATE_ASSIGNMENT_IN_PROGRESS: "CERTIFICATE_ASSIGNMENT_IN_PROGRESS",
  CERTIFICATE_ASSIGNMENT_FAILED: "CERTIFICATE_ASSIGNMENT_FAILED",
  CERTIFICATE_ASSIGNED: "CERTIFICATE_ASSIGNED",
  CERTIFICATE_CREATION_IN_PROGRESS: "CERTIFICATE_CREATION_IN_PROGRESS",
  CERTIFICATE_CREATION_FAILED: "CERTIFICATE_CREATION_FAILED",
  CERTIFICATE_CREATED: "CERTIFICATE_CREATED",
  EMAIL_SEND_IN_PROGRESS: "EMAIL_SEND_IN_PROGRESS",
  EMAIL_SEND_FAILED: "EMAIL_SEND_FAILED",
  EMAIL_SENT: "EMAIL_SENT",
};

const steps = [
  { label: "Draft", value: listStatus.DRAFT },
  {
    label: "Certificate Assignment",
    values: [
      listStatus.CERTIFICATE_ASSIGNMENT_IN_PROGRESS,
      listStatus.CERTIFICATE_ASSIGNMENT_FAILED,
      listStatus.CERTIFICATE_ASSIGNED,
    ],
  },
  {
    label: "Certificate Creation",
    values: [
      listStatus.CERTIFICATE_CREATION_IN_PROGRESS,
      listStatus.CERTIFICATE_CREATION_FAILED,
      listStatus.CERTIFICATE_CREATED,
    ],
  },
  {
    label: "Email Sending",
    values: [
      listStatus.EMAIL_SEND_IN_PROGRESS,
      listStatus.EMAIL_SEND_FAILED,
      listStatus.EMAIL_SENT,
    ],
  },
];

export default function EmailListPage() {
  const listId = window.location.pathname.split("/")[1];

  const [loading, setLoading] = useState(true);
  const [currentList, setCurrentList] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const fetchEmailLists = async () => {
    setLoading(true);
    var tempList = await appwriteDatabases.getDocument(
      db,
      collection.emailLists,
      listId
    );

    tempList.list = tempList.list.map((x) => JSON.parse(x));

    setCurrentList(tempList);
    setLoading(false);
  };

  useEffect(() => {
    fetchEmailLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateCertificates = async () => {
    await appwriteDatabases.updateDocument(db, collection.emailLists, listId, {
      status: listStatus.CERTIFICATE_CREATION_IN_PROGRESS,
    });
    appwriteFunctions.createExecution(
      "create-certs",
      JSON.stringify({ campaignId: currentList.$id }),
      true
    );

    setSnackbar({
      open: true,
      message: `Certificate creation for "${currentList.name}" has been scheduled!`,
      severity: "success",
    });

    setCurrentList({
      ...currentList,
      status: listStatus.CERTIFICATE_CREATION_IN_PROGRESS,
    });
  };

  const handleSendEmails = async () => {
    await appwriteDatabases.updateDocument(db, collection.emailLists, listId, {
      status: listStatus.EMAIL_SEND_IN_PROGRESS,
    });
    appwriteFunctions.createExecution(
      "send-email",
      JSON.stringify({ campaignId: currentList.$id }),
      true
    );

    setSnackbar({
      open: true,
      message: `Email list "${currentList.name}" has been scheduled successfully!`,
      severity: "success",
    });

    setCurrentList({
      ...currentList,
      status: listStatus.EMAIL_SEND_IN_PROGRESS,
    });
  };

  const handleAssignCertificates = async () => {
    await appwriteDatabases.updateDocument(db, collection.emailLists, listId, {
      status: listStatus.CERTIFICATE_ASSIGNMENT_IN_PROGRESS,
    });
    appwriteFunctions.createExecution(
      "create-email-obj",
      JSON.stringify({ campaignId: currentList.$id }),
      true
    );

    setSnackbar({
      open: true,
      message: `Certificate assignment for "${currentList.name}" has been scheduled!`,
      severity: "success",
    });

    setCurrentList({
      ...currentList,
      status: listStatus.CERTIFICATE_ASSIGNMENT_IN_PROGRESS,
    });
  };

  const getActiveStep = (status) => {
    if (status === listStatus.DRAFT) return 1;
    else if (status === listStatus.CERTIFICATE_ASSIGNMENT_IN_PROGRESS) return 1;
    else if (status === listStatus.CERTIFICATE_ASSIGNMENT_FAILED) return 1;
    else if (status === listStatus.CERTIFICATE_ASSIGNED) return 2;
    else if (status === listStatus.CERTIFICATE_CREATION_IN_PROGRESS) return 2;
    else if (status === listStatus.CERTIFICATE_CREATION_FAILED) return 2;
    else if (status === listStatus.CERTIFICATE_CREATED) return 3;
    else if (status === listStatus.EMAIL_SEND_IN_PROGRESS) return 3;
    else if (status === listStatus.EMAIL_SEND_FAILED) return 3;
    else if (status === listStatus.EMAIL_SENT) return 4;
    else return 0;
  };

  const getStepState = (stepIndex, currentStatus) => {
    if (stepIndex === 1) {
      if (currentStatus === listStatus.CERTIFICATE_ASSIGNMENT_IN_PROGRESS) {
        return "in-progress";
      } else if (currentStatus === listStatus.CERTIFICATE_ASSIGNMENT_FAILED) {
        return "error";
      } else if (currentStatus !== listStatus.DRAFT) {
        return "success";
      }
    } else if (stepIndex === 2) {
      if (currentStatus === listStatus.CERTIFICATE_CREATION_IN_PROGRESS) {
        return "in-progress";
      } else if (currentStatus === listStatus.CERTIFICATE_CREATION_FAILED) {
        return "error";
      } else if (
        currentStatus !== listStatus.DRAFT &&
        currentStatus !== listStatus.CERTIFICATE_ASSIGNMENT_IN_PROGRESS &&
        currentStatus !== listStatus.CERTIFICATE_ASSIGNMENT_FAILED &&
        currentStatus !== listStatus.CERTIFICATE_ASSIGNED
      ) {
        return "success";
      }
    } else if (stepIndex === 3) {
      if (currentStatus === listStatus.EMAIL_SEND_IN_PROGRESS) {
        return "in-progress";
      } else if (currentStatus === listStatus.EMAIL_SEND_FAILED) {
        return "error";
      } else if (currentStatus === listStatus.EMAIL_SENT) {
        return "success";
      }
    }
    return "default";
  };

  const getButtonProps = (status) => {
    if (status === listStatus.DRAFT) {
      return {
        text: "Assign Certificates",
        onClick: handleAssignCertificates,
        disabled: false,
        show: true,
      };
    }
    if (status === listStatus.CERTIFICATE_ASSIGNMENT_FAILED) {
      return {
        text: "Retry Certificate Assignment",
        onClick: handleAssignCertificates,
        disabled: false,
        show: true,
      };
    }
    if (status === listStatus.CERTIFICATE_ASSIGNED) {
      return {
        text: "Create Certificates",
        onClick: handleCreateCertificates,
        disabled: false,
        show: true,
      };
    }
    if (status === listStatus.CERTIFICATE_CREATION_FAILED) {
      return {
        text: "Retry Certificate Creation",
        onClick: handleCreateCertificates,
        disabled: false,
        show: true,
      };
    }
    if (status === listStatus.CERTIFICATE_CREATED) {
      return {
        text: "Send Emails",
        onClick: handleSendEmails,
        disabled: false,
        show: true,
      };
    }
    if (status === listStatus.EMAIL_SEND_FAILED) {
      return {
        text: "Retry Sending Emails",
        onClick: handleSendEmails,
        disabled: false,
        show: true,
      };
    }
    if (
      status === listStatus.CERTIFICATE_CREATION_IN_PROGRESS ||
      status === listStatus.CERTIFICATE_ASSIGNMENT_IN_PROGRESS ||
      status === listStatus.EMAIL_SEND_IN_PROGRESS
    ) {
      return {
        show: false,
      };
    }
    if (status === listStatus.EMAIL_SENT) {
      return {
        show: false,
      };
    }
    return {
      show: false,
    };
  };

  // Snackbar close handler
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          {currentList?.name}
        </Typography>
        {currentList && getButtonProps(currentList.status).show && (
          <Button
            variant="contained"
            color="primary"
            startIcon={
              currentList.status === listStatus.DRAFT ||
              currentList.status ===
                listStatus.CERTIFICATE_ASSIGNMENT_FAILED ? (
                <AssignmentIcon />
              ) : currentList.status === listStatus.CERTIFICATE_ASSIGNED ||
                currentList.status ===
                  listStatus.CERTIFICATE_CREATION_FAILED ? (
                <WorkIcon />
              ) : currentList.status === listStatus.CERTIFICATE_CREATED ||
                currentList.status === listStatus.EMAIL_SEND_FAILED ? (
                <SendIcon />
              ) : (
                <ReplayIcon />
              )
            }
            onClick={getButtonProps(currentList.status).onClick}
            disabled={getButtonProps(currentList.status).disabled}
          >
            {getButtonProps(currentList.status).text}
          </Button>
        )}
      </Box>

      {currentList &&
        (currentList.status === listStatus.CERTIFICATE_ASSIGNMENT_IN_PROGRESS ||
          currentList.status === listStatus.EMAIL_SEND_IN_PROGRESS ||
          currentList.status ===
            listStatus.CERTIFICATE_CREATION_IN_PROGRESS) && (
          <Alert severity="info" sx={{ mb: 3 }}>
            The process is running in the background. Refresh the page manually
            to see the latest status.
          </Alert>
        )}

      {currentList && (
        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={getActiveStep(currentList.status)}>
            {steps.map((step, index) => (
              <Step key={index}>
                <StepLabel
                  error={getStepState(index, currentList.status) === "error"}
                  icon={
                    getStepState(index, currentList.status) ===
                    "in-progress" ? (
                      <PendingIcon />
                    ) : undefined
                  }
                >
                  {step.label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      )}

      {loading && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Loading data from server. Please wait....
          </Typography>
        </Paper>
      )}

      {currentList && (
        <Paper sx={{ width: "100%", mb: 2, boxShadow: 6, borderRadius: 3 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "primary.main" }}>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "white",
                      fontSize: 16,
                      py: 2,
                    }}
                  >
                    S.No.
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "white",
                      fontSize: 16,
                      py: 2,
                    }}
                  >
                    Email
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "white",
                      fontSize: 16,
                      py: 2,
                    }}
                  >
                    Name
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "white",
                      fontSize: 16,
                      py: 2,
                    }}
                  >
                    College
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "white",
                      fontSize: 16,
                      py: 2,
                    }}
                  >
                    Hour
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "white",
                      fontSize: 16,
                      py: 2,
                    }}
                  >
                    Certificate
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "white",
                      fontSize: 16,
                      py: 2,
                    }}
                  >
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentList.list.map((email, index) => {
                  const isStriped = index % 2 === 1;
                  return (
                    <TableRow
                      key={index}
                      hover
                      sx={{
                        backgroundColor: isStriped ? "grey.100" : "white",
                        transition: "background 0.2s",
                        "&:hover": {
                          backgroundColor: "secondary.light",
                        },
                      }}
                    >
                      <CertificateRow
                        email={email.email}
                        name={email.name}
                        college={email.college}
                        hour={email.hour}
                        listId={listId}
                        appwriteDatabases={appwriteDatabases}
                        index={index}
                      />
                    </TableRow>
                  );
                })}
                {(!currentList || currentList.list.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      This list has no emails.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

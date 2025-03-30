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
} from "@mui/material";
import { useEffect, useState } from "react";
import SendIcon from "@mui/icons-material/Send";
import { Client, Databases, Functions, Query } from "appwrite";

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

export default function EmailListPage(params) {
  const listId = window.location.pathname.split("/")[1];

  const [loading, setLoading] = useState(true);
  const [currentList, setCurrentList] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const listAllDocuments = async (databaseId, collectionId, queries) => {
    var res = [];
    var tempQueries = queries;
    tempQueries.push(Query.limit(100));
    const page0 = await appwriteDatabases.listDocuments(
      databaseId,
      collectionId,
      tempQueries
    );
    if (page0.documents.length === 0) return res;
    res = res.concat(page0.documents);
    var availableNext = true;
    var lastId = page0.documents[page0.documents.length - 1].$id;
    while (availableNext) {
      var tempQueries_2 = [];
      for (let i in tempQueries) {
        tempQueries_2.push(tempQueries[i]);
      }
      tempQueries_2.push(Query.cursorAfter(lastId));
      const nextPage = await appwriteDatabases.listDocuments(
        databaseId,
        collectionId,
        tempQueries_2
      );
      if (nextPage.documents.length === 0) {
        availableNext = false;
      } else {
        res = res.concat(nextPage.documents);
        lastId = nextPage.documents[nextPage.documents.length - 1].$id;
      }
    }
    return res;
  };

  const fetchEmailLists = async () => {
    setLoading(true);
    var tempList = await appwriteDatabases.getDocument(
      db,
      collection.emailLists,
      listId
    );

    tempList.list = tempList.list.map((x) => JSON.parse(x));

    const newStatusList = await listAllDocuments(db, collection.certificates, [
      Query.equal("email_list_id", listId),
    ]);

    var isCompleted = "COMPLETED";

    for (let i in tempList.list) {
      const c = newStatusList.find(
        (value) =>
          value.email === tempList.list[i].email &&
          value.name === tempList.list[i].name
      );
      if (c) tempList.list[i] = { ...c };

      if (!tempList.list[i]?.email_sent) {
        isCompleted = "IN_PROGRESS";
      }
    }

    await appwriteDatabases.updateDocument(db, collection.emailLists, listId, {
      status: "COMPLETED",
    });

    console.log({ ...tempList, status: isCompleted });
    setCurrentList(tempList);
    setLoading(false);
  };

  useEffect(() => {
    fetchEmailLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendEmails = async () => {
    await appwriteDatabases.updateDocument(
      db,
      collection.emailLists,
      currentList.$id,
      {
        status: "IN_PROGRESS",
      }
    );

    appwriteFunctions.createExecution(
      "create-email-obj",
      JSON.stringify({ doc: currentList.$id }),
      true
    );

    setSnackbar({
      open: true,
      message: `Email list "${currentList.name}" has been scheduled successfully!`,
      severity: "success",
    });

    await fetchEmailLists();
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
        <Button
          variant="contained"
          color="primary"
          startIcon={<SendIcon />}
          onClick={(e) => {
            handleSendEmails();
          }}
          disabled={currentList?.status !== "DRAFT"}
        >
          {currentList?.status === "DRAFT"
            ? "Schedule Mailing"
            : currentList?.status === "IN_PROGRESS"
            ? "Mail Send is In Progress"
            : "Sent successfully"}
        </Button>
      </Box>

      {loading && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Loading data from server. Please wait....
          </Typography>
        </Paper>
      )}

      {currentList && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Hour</TableCell>
                <TableCell>Certificate ID</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentList.list.map((email, index) => (
                <TableRow key={index}>
                  <TableCell>{email.email}</TableCell>
                  <TableCell>{email.name}</TableCell>
                  <TableCell>{email.hour}</TableCell>
                  <TableCell>{email?.certificate_id}</TableCell>
                  <TableCell>
                    {email.email_sent ? (
                      <span style={{ color: "green" }}>Sent</span>
                    ) : (
                      <span style={{ color: "red" }}>Not Sent</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!currentList || currentList.list.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    This list has no emails.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
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

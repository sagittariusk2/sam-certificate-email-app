import React, { useState, useEffect, useRef } from "react";
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Box,
  TextField,
  Alert,
  Snackbar,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Client, Databases, Query, ID } from "appwrite";
import { useNavigate } from "react-router-dom";

const appwriteClient = new Client()
  .setEndpoint("https://cloud.appwrite.io/v1")
  .setProject("social-action-mobilizer");
const appwriteDatabases = new Databases(appwriteClient);

const db = "sam-core";
const collection = {
  emailLists: "email-lists",
  certificates: "certificates",
};

function AllListsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [allLists, setAllLists] = useState([]);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [listNameInput, setListNameInput] = useState("");
  const [parsedData, setParsedData] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const fileInputRef = useRef(null);

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
    var emailLists = await listAllDocuments(db, collection.emailLists, [
      Query.orderDesc("$createdAt"),
    ]);

    for (let i in emailLists) {
      emailLists[i].list = emailLists[i].list.map((x) => JSON.parse(x));
    }

    setAllLists(emailLists);
    setLoading(false);
  };

  // Load lists on component mount
  useEffect(() => {
    fetchEmailLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenUploadDialog = () => {
    setUploadedFile(null);
    setListNameInput("");
    setParsedData([]);
    setOpenUploadDialog(true);
  };

  const handleCloseUploadDialog = () => {
    setOpenUploadDialog(false);
  };

  // File upload handling
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
      parseCSVFile(file);
    }
  };

  const parseCSVFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const lines = content.split("\n");

      const parsedEmails = [];
      // Start from index 1 to skip header row
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "") continue;

        const values = lines[i].split(",");
        if (values.length >= 3) {
          parsedEmails.push({
            name: values[0]?.trim() || "",
            email: values[1]?.trim() || "",
            hour: values[2]?.trim() || "",
            status: false,
          });
        }
      }
      setParsedData(parsedEmails);
    };
    reader.readAsText(file);
  };

  const handleUploadConfirm = async () => {
    if (listNameInput.trim() === "") {
      setSnackbar({
        open: true,
        message: "Please enter a list name",
        severity: "error",
      });
      return;
    }

    if (parsedData.length === 0) {
      setSnackbar({
        open: true,
        message: "No valid data found in CSV file",
        severity: "error",
      });
      return;
    }

    const newParsedData = parsedData.map((data) => JSON.stringify(data));

    try {
      setUploading(true);
      await appwriteDatabases.createDocument(
        db,
        collection.emailLists,
        ID.unique(),
        {
          name: listNameInput,
          list: newParsedData,
        }
      );

      fetchEmailLists();
      setUploading(false);

      setSnackbar({
        open: true,
        message: `Email list "${listNameInput}" has been saved successfully!`,
        severity: "success",
      });

      handleCloseUploadDialog();
    } catch (e) {
      setSnackbar({
        open: true,
        message: e.message,
        severity: "error",
      });
      return;
    }
  };

  // Snackbar close handler
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Trigger file input click
  const handleUploadButtonClick = () => {
    fileInputRef.current.click();
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
          All Email Lists
        </Typography>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={handleOpenUploadDialog}
        >
          Create New List
        </Button>
      </Box>

      {loading && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Loading data from server. Please wait....
          </Typography>
        </Paper>
      )}

      {allLists.length > 0 ? (
        <Paper sx={{ width: "100%", mb: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>List Name</TableCell>
                  <TableCell>Email Count</TableCell>
                  <TableCell>Created At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allLists.map((emailList) => {
                  const totalCount = emailList.list.length;

                  return (
                    <TableRow
                      key={emailList.$id}
                      hover
                      onClick={() => navigate(`/${emailList.$id}`)}
                      sx={{ cursor: "pointer" }}
                    >
                      <TableCell>{emailList.name}</TableCell>
                      <TableCell>{totalCount}</TableCell>
                      <TableCell>{emailList.$createdAt}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            No email lists saved yet. Create a new list by uploading a CSV file.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={handleOpenUploadDialog}
          >
            Create Your First List
          </Button>
        </Paper>
      )}

      {/* Upload CSV Dialog */}
      <Dialog
        open={openUploadDialog}
        onClose={handleCloseUploadDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create New Email List</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Upload a CSV file with email data. The CSV should have columns for
            email, name, and hour.
          </DialogContentText>

          <TextField
            autoFocus
            margin="dense"
            label="List Name"
            fullWidth
            value={listNameInput}
            onChange={(e) => setListNameInput(e.target.value)}
            variant="outlined"
            sx={{ mb: 3 }}
          />

          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: "none" }}
            ref={fileInputRef}
          />

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 2,
            }}
          >
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUploadIcon />}
              onClick={handleUploadButtonClick}
              sx={{ mb: 2 }}
            >
              Select CSV File
            </Button>

            {uploadedFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected file: {uploadedFile.name}
              </Typography>
            )}

            {parsedData.length > 0 && (
              <Alert severity="success" sx={{ mt: 2, width: "100%" }}>
                Successfully parsed {parsedData.length} email records from the
                CSV file.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>Cancel</Button>
          <Button
            onClick={handleUploadConfirm}
            color="primary"
            disabled={
              uploading ||
              !uploadedFile ||
              listNameInput.trim() === "" ||
              parsedData.length === 0
            }
          >
            {uploading ? "Uploading..." : "Create List"}
          </Button>
        </DialogActions>
      </Dialog>

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

export default AllListsPage;

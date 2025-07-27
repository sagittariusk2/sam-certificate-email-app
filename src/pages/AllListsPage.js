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
      Query.limit(100),
    ]);

    for (let i in emailLists) {
      emailLists[i].list = emailLists[i].list.map((x) => JSON.parse(x));
      emailLists[i].$createdAt = new Date(
        emailLists[i].$createdAt
      ).toLocaleString();
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

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const parseCSVFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const lines = content.split("\n");

      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const requiredColumns = ["name", "email", "hour", "college"];
      const missingColumns = requiredColumns.filter(
        (col) => !header.includes(col)
      );

      if (missingColumns.length > 0) {
        setSnackbar({
          open: true,
          message: `CSV header must include: ${missingColumns.join(", ")}`,
          severity: "error",
        });
        setUploadedFile(null);
        setParsedData([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      const uniqueSet = new Set();
      const parsedEmails = [];
      const invalidEmails = [];
      const duplicatePairs = [];

      // Start from index 1 to skip header row
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "") continue;

        const values = lines[i].split(",");
        if (values.length >= 4) {
          const name = values[0]?.trim() || "";
          const email = values[1]?.trim() || "";
          const college = values[2]?.trim() || "";
          const hour = values[3]?.trim() || "";

          // Validate email
          if (!validateEmail(email)) {
            invalidEmails.push({ email, line: i + 1 });
            continue;
          }

          // Uniqueness only on name+email
          const uniqueKey = `${name}|${email}`;

          if (name && email && hour) {
            if (uniqueSet.has(uniqueKey)) {
              duplicatePairs.push({ name, email, line: i + 1 });
            } else {
              uniqueSet.add(uniqueKey);
              parsedEmails.push({
                name: name,
                email: email,
                hour: hour,
                college: college,
              });
            }
          }
        }
      }

      if (invalidEmails.length > 0) {
        const errorMessage = `Invalid email(s) found:\n${invalidEmails
          .map((e) => `Line ${e.line}: ${e.email}`)
          .join("\n")}`;
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: "error",
        });
        setUploadedFile(null);
        setParsedData([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      if (duplicatePairs.length > 0) {
        const errorMessage = `Duplicate (name, email) pairs found. Please remove these duplicates and try again:\n${duplicatePairs
          .map((d) => `Line ${d.line}: (${d.name}, ${d.email})`)
          .join("\n")}`;
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: "error",
        });
        setUploadedFile(null);
        setParsedData([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
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
          Campaign Certificate List
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
                    Campaign Name
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "white",
                      fontSize: 16,
                      py: 2,
                    }}
                  >
                    # of Participants
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      color: "white",
                      fontSize: 16,
                      py: 2,
                    }}
                  >
                    Created At
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
                {allLists.map((emailList, idx) => {
                  const totalCount = emailList.list.length;
                  const isStriped = idx % 2 === 1;
                  return (
                    <TableRow
                      key={emailList.$id}
                      hover
                      onClick={() => navigate(`/${emailList.$id}`)}
                      sx={{
                        cursor: "pointer",
                        backgroundColor: isStriped ? "grey.100" : "white",
                        transition: "background 0.2s",
                        "&:hover": {
                          backgroundColor: "secondary.light",
                        },
                      }}
                    >
                      <TableCell sx={{ py: 2, fontSize: 15 }}>
                        {emailList.name}
                      </TableCell>
                      <TableCell sx={{ py: 2, fontSize: 15 }}>
                        {totalCount}
                      </TableCell>
                      <TableCell sx={{ py: 2, fontSize: 15 }}>
                        {emailList.$createdAt}
                      </TableCell>
                      <TableCell sx={{ py: 2, fontSize: 15 }}>
                        {emailList.status}
                      </TableCell>
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
        <DialogTitle>Create New Campaign Certificate List</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Upload a CSV file with email data. The CSV should have columns for
            email, name, hour and college.
          </DialogContentText>

          <TextField
            autoFocus
            margin="dense"
            label="Campaign Name"
            fullWidth
            value={listNameInput}
            onChange={(e) => setListNameInput(e.target.value)}
            variant="outlined"
            sx={{ mb: 3 }}
            required
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
            {/* Note above Select CSV File button */}
            <Alert severity="info" sx={{ mb: 2, width: "100%" }}>
              <strong>Note:</strong>
              <ul style={{ margin: 0, paddingLeft: "1.2em" }}>
                <li>
                  <b>name</b>, <b>email</b>, <b>college</b>, <b>hour</b> should
                  be <b>mandatory</b> in the CSV file.
                </li>
                <li>
                  There should be <b>no duplicate row</b> (same name & email).
                </li>
                <li>
                  Email should be <b>valid</b>.
                </li>
                <li>
                  There should not be any comma (<b>,</b>) in the college.
                </li>
              </ul>
            </Alert>
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

            <Box
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: "grey.50",
                borderRadius: 1,
                border: "1px solid grey.300",
                fontFamily: "monospace",
                fontSize: "0.875rem",
              }}
            >
              <Typography variant="body2" sx={{ mb: 1, fontWeight: "bold" }}>
                CSV file should look like this:
              </Typography>
              <Box
                sx={{
                  backgroundColor: "white",
                  p: 1,
                  borderRadius: 0.5,
                  border: "1px solid grey.400",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#e3f2fd",
                    padding: "4px 8px",
                    fontWeight: "bold",
                    borderBottom: "1px solid #bbdefb",
                  }}
                >
                  name,email,college,hour
                </div>
                <div
                  style={{
                    backgroundColor: "#f3e5f5",
                    padding: "4px 8px",
                    borderBottom: "1px solid #e1bee7",
                  }}
                >
                  Sam,volunteer@sam.org,Indian Institution of Technology Patna,2
                </div>
                <div
                  style={{
                    backgroundColor: "#e8f5e8",
                    padding: "4px 8px",
                  }}
                >
                  John,john@example.com,University of Delhi,3
                </div>
              </Box>
            </Box>
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

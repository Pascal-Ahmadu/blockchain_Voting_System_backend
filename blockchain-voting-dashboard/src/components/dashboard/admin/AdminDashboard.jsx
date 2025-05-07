import React, { useState } from "react";
import { addCandidate, startVoting, endVoting } from "../../../utils/api";
import {
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Snackbar,
  Alert,
  Box,
  Divider
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import StopCircleIcon from "@mui/icons-material/StopCircle";

const AdminDashboard = () => {
  const [candidateName, setCandidateName] = useState("");
  const [message, setMessage] = useState("");
  const [messageSeverity, setMessageSeverity] = useState("info");
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const showMessage = (msg, severity = "info") => {
    setMessage(msg);
    setMessageSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleAddCandidate = async () => {
    if (!candidateName.trim()) {
      showMessage("Candidate name cannot be empty!", "warning");
      return;
    }
    
    const sessionToken = localStorage.getItem("sessionToken");
    try {
      const response = await addCandidate(candidateName, sessionToken);
      showMessage(response.data.message, "success");
      setCandidateName("");
    } catch (error) {
      showMessage("Error adding candidate.", "error");
    }
  };

  const handleStartVoting = async () => {
    try {
      await startVoting();
      showMessage("Voting started!", "success");
    } catch (error) {
      showMessage("Error starting voting.", "error");
    }
  };

  const handleEndVoting = async () => {
    try {
      await endVoting();
      showMessage("Voting ended!", "success");
    } catch (error) {
      showMessage("Error ending voting.", "error");
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Card elevation={3} sx={{ borderRadius: 3, overflow: "hidden" }}>
        <CardContent>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Admin Dashboard
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* Candidate Input Section */}
          <Box display="flex" gap={2} alignItems="center" mb={3}>
            <TextField
              fullWidth
              label="Candidate Name"
              variant="outlined"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleAddCandidate}
              startIcon={<AddCircleIcon />}
              sx={{ minWidth: "160px" }}
            >
              Add Candidate
            </Button>
          </Box>

          {/* Voting Controls */}
          <Box display="flex" justifyContent="space-between" mt={3}>
            <Button
              variant="contained"
              color="success"
              onClick={handleStartVoting}
              startIcon={<HowToVoteIcon />}
              sx={{ flex: 1, mr: 1 }}
            >
              Start Voting
            </Button>

            <Button
              variant="contained"
              color="error"
              onClick={handleEndVoting}
              startIcon={<StopCircleIcon />}
              sx={{ flex: 1, ml: 1 }}
            >
              End Voting
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Snackbar Alert */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={messageSeverity} variant="filled" onClose={() => setSnackbarOpen(false)}>
          {message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminDashboard;

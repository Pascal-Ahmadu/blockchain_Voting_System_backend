import React, { useState, useEffect } from "react";
import { getCandidates, registerVoter, castVote, debugTokenState, ensureValidSessionToken } from "../../../utils/api";
import { useNavigate } from 'react-router-dom';
import ApiErrorDisplay from "../../../utils/apiErrorHandler";
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  CircularProgress,
  Container,
  Grid,
  Paper,
  Alert,
  Snackbar,
  Chip,
  useTheme,
  alpha,
  Divider
} from "@mui/material";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { styled } from "@mui/material/styles";


// Custom styled components
const CandidateCard = styled(Card)(({ theme, isSelected }) => ({
  cursor: "pointer",
  height: "100%",
  transition: "all 0.3s ease",
  position: "relative",
  border: isSelected ? `2px solid ${theme.palette.primary.main}` : "none",
  boxShadow: isSelected ? theme.shadows[8] : theme.shadows[1],
  "&:hover": {
    boxShadow: theme.shadows[6],
    transform: "translateY(-4px)",
  },
}));

const VoteButton = styled(Button)(({ theme }) => ({
  borderRadius: 20,
  padding: "8px 24px",
  fontSize: "0.875rem",
  fontWeight: 600,
  boxShadow: theme.shadows[2],
  "&:hover": {
    boxShadow: theme.shadows[4],
  },
}));

const VoteCountChip = styled(Chip)(({ theme }) => ({
  position: "absolute",
  top: 16,
  right: 16,
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
  fontWeight: 600,
}));

const CastVote = ({ userAddress }) => {
  const theme = useTheme();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [votingStatus, setVotingStatus] = useState("");
  const [error, setError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");
  const navigate = useNavigate();

  // Check for valid session on component mount
  useEffect(() => {
    const checkSession = async () => {
      const isValid = await ensureValidSessionToken();
      if (!isValid) {
        showSnackbar("Your session has expired. Redirecting to login...", "error");
        setTimeout(() => navigate("/"), 3000);
      }
    };
    
    checkSession();
  }, [navigate]);

  const showSnackbar = (message, severity = "info") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getCandidates();
      setCandidates(response.data || []);
    } catch (err) {
      console.error("Error fetching candidates:", err);
      setError(err);
      
      // If it's an auth error, redirect to login
      if (err.response?.status === 401) {
        showSnackbar("Your session has expired. Redirecting to login...", "error");
        setTimeout(() => navigate("/"), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleVote = async (candidateId) => {
    try {
      await registerVoter(userAddress);  // Register voter first
      await castVote(candidateId);       // Then vote
      showSnackbar("Your vote has been recorded successfully!", "success");
    } catch (error) {
      showSnackbar(error.response?.data?.error || "Failed to vote", "error");
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        my={4}
        py={8}
      >
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" color="textSecondary" mt={2}>
          Loading candidates...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box mb={4} mt={2}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            backgroundColor: theme.palette.background.default,
            borderRadius: 2
          }}
        >
          <Box display="flex" alignItems="center" mb={2}>
            <HowToVoteIcon fontSize="large" color="primary" sx={{ mr: 2 }} />
            <Typography variant="h4" component="h1" fontWeight="bold">
              Cast Your Vote
            </Typography>
          </Box>
          <Typography variant="body1" color="textSecondary" mb={2}>
            Select a candidate and cast your vote. Your vote is recorded on the blockchain and cannot be changed.
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {error && (
            <Box mb={3}>
              <ApiErrorDisplay
                error={error}
                onRetry={fetchCandidates}
              />
            </Box>
          )}
          
          {votingStatus && (
            <Alert 
              severity={votingStatus.includes("Failed") ? "warning" : "info"} 
              sx={{ mb: 3 }}
            >
              {votingStatus}
            </Alert>
          )}
          
          {candidates && candidates.length > 0 ? (
            <Grid container spacing={3}>
              {candidates.map((candidate) => (
                <Grid item xs={12} sm={6} md={4} key={candidate.id}>
                  <CandidateCard 
                    isSelected={selectedCandidate === candidate.id}
                    onClick={() => setSelectedCandidate(candidate.id)}
                  >
                    <VoteCountChip 
                      label={`${candidate.voteCount} votes`} 
                      size="small" 
                      icon={<CheckCircleIcon fontSize="small" />}
                    />
                    <CardContent sx={{ pt: 2, pb: 1 }}>
                      <Typography variant="h5" component="h2" gutterBottom>
                        {candidate.name}
                      </Typography>
                      {candidate.description && (
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                          {candidate.description}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <VoteButton
                        variant="contained"
                        color="primary"
                        fullWidth
                        disableElevation
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(candidate.id);
                        }}
                        disabled={votingStatus.includes("Submitting")}
                        startIcon={
                          votingStatus.includes("Submitting") ? (
                            <CircularProgress size={20} color="inherit" />
                          ) : (
                            <HowToVoteIcon />
                          )
                        }
                      >
                        Vote
                      </VoteButton>
                    </CardActions>
                  </CandidateCard>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Paper 
              elevation={0} 
              sx={{ 
                p: 4, 
                textAlign: "center", 
                backgroundColor: alpha(theme.palette.background.paper, 0.5),
                borderRadius: 2
              }}
            >
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No candidates available for voting.
              </Typography>
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={fetchCandidates}
                startIcon={<RefreshIcon />}
                sx={{ mt: 2 }}
              >
                Refresh Candidates
              </Button>
            </Paper>
          )}
        </Paper>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity} 
          elevation={6}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CastVote;
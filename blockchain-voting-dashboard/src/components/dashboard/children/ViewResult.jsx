import React, { useEffect, useState } from "react";
import { getResults } from "../../../utils/api";
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Skeleton,
  Box
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import HowToVoteIcon from "@mui/icons-material/HowToVote";

const ViewResults = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await getResults();
        setCandidates(response.data.candidates || []);
      } catch (error) {
        setError("Error fetching results.");
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 5 }}>
      <Card elevation={3} sx={{ borderRadius: 3, overflow: "hidden" }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <HowToVoteIcon fontSize="large" color="primary" />
            <Typography variant="h4" fontWeight="bold">
              Election Results
            </Typography>
          </Box>

          {/* Loading State */}
          {loading && (
            <Box display="flex" justifyContent="center" my={3}>
              <CircularProgress size={50} />
            </Box>
          )}

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Table for Results */}
          {!loading && candidates.length > 0 && (
            <TableContainer component={Paper} elevation={2}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Candidate Name</TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>Votes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {candidates.map((candidate) => (
                    <TableRow key={candidate.id} hover>
                      <TableCell align="center">{candidate.id}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {candidate.voteCount > 0 && <EmojiEventsIcon color="success" />}
                          {candidate.name}
                        </Box>
                      </TableCell>
                      <TableCell align="center">{candidate.voteCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* No Candidates Found */}
          {!loading && candidates.length === 0 && (
            <Typography variant="body1" color="textSecondary" align="center" mt={3}>
              No election results available.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default ViewResults;

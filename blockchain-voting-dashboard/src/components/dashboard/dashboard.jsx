import React from "react";
import { Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemText, Divider } from "@mui/material";
import { Link, Outlet } from "react-router-dom";

const drawerWidth = 260;

const DashboardLayout = ({ userAddress }) => {
  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "#f4f6f8" }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            bgcolor: "#1e293b",
            color: "white",
            paddingTop: 2,
          },
        }}
      >
        <Toolbar />
        <List>
          <ListItem component={Link} to="/dashboard/vote" button sx={{ "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" } }}>
            <ListItemText primary="Cast Vote" sx={{ color: "white" }} />
          </ListItem>
          <ListItem component={Link} to="/dashboard/results" button sx={{ "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" } }}>
            <ListItemText primary="View Results" sx={{ color: "white" }} />
          </ListItem>
          <ListItem component={Link} to="/dashboard/admin" button sx={{ "&:hover": { bgcolor: "rgba(255, 255, 255, 0.1)" } }}>
            <ListItemText primary="Admin Panel" sx={{ color: "white" }} />
          </ListItem>
        </List>
      </Drawer>

      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {/* Navbar */}
        <AppBar position="static" sx={{ backgroundColor: "#1976d2", boxShadow: "none" }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: "bold" }}>
              Blockchain Voting System
            </Typography>
            <Typography variant="body1" sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
              {userAddress ? `Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : "Not Connected"}
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box sx={{ p: 4, flexGrow: 1 }}>
          <Outlet /> {/* This ensures child routes render correctly inside the layout */}
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;

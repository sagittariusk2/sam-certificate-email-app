// components/Navbar.js
import React from "react";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { Link } from "react-router-dom";

function Navbar() {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Social Action Mobilizer Certificate Manager
        </Typography>
        <Box>
          <Button color="inherit" component={Link} to="/">
            Home
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;

// Debug JWT token
import jwt from 'jsonwebtoken';

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjExLCJlbWFpbCI6InRlc3RtZUBnbWFpbC5jb20iLCJyb2xlIjoiU0VOSU9SIiwiaWF0IjoxNzYwNDk5MzIzLCJleHAiOjE3NjA1ODU3MjN9.b30_D9tXF_GM0exJ8zjrZHHaPxtnupe6SRTrQShwK7I";
const secret = "office-seniors-super-secret-jwt-key-2024-change-this-in-production";

try {
  // Decode without verification to see payload
  const decoded = jwt.decode(token);
  console.log("Decoded payload:", decoded);
  
  // Check if expired
  const now = Math.floor(Date.now() / 1000);
  console.log("Current timestamp:", now);
  console.log("Token expires at:", decoded.exp);
  console.log("Is expired?", now > decoded.exp);
  
  // Try to verify
  const verified = jwt.verify(token, secret);
  console.log("Verification successful:", verified);
} catch (error) {
  console.error("JWT Error:", error.message);
}

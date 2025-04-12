#!/bin/bash

# Variables
TEST_USER="testuser"

# Delete the test user
echo "Deleting test user..."
sudo sysadminctl -deleteUser $TEST_USER

echo "Test environment cleaned up."
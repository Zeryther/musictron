#!/bin/bash
set -e

# Enable 32-bit architecture
sudo dpkg --add-architecture i386

# Add WineHQ repository key
sudo mkdir -pm755 /etc/apt/keyrings
sudo wget -O /etc/apt/keyrings/winehq-archive.key https://dl.winehq.org/wine-builds/winehq.key

# Add WineHQ repository for Ubuntu 24.04 (Noble)
sudo wget -NP /etc/apt/sources.list.d/ https://dl.winehq.org/wine-builds/ubuntu/dists/noble/winehq-noble.sources

# Update package lists
sudo apt update

# Install Wine (stable branch, fall back to devel if unavailable)
if apt-cache show winehq-stable &>/dev/null; then
    sudo apt install -y --install-recommends winehq-stable
else
    echo "Stable branch not available, installing devel branch..."
    sudo apt install -y --install-recommends winehq-devel
fi

# Verify installation
wine --version

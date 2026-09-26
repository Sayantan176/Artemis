import os
import tarfile
import requests
from dotenv import load_dotenv

# Load the license key from .env
load_dotenv()
LICENSE_KEY = os.getenv("MAXMIND_LICENSE_KEY")

def download_and_extract(edition_id):
    print(f"Downloading {edition_id}...")
    url = f"https://download.maxmind.com/app/geoip_download?edition_id={edition_id}&license_key={LICENSE_KEY}&suffix=tar.gz"
    
    response = requests.get(url, stream=True)
    if response.status_code != 200:
        print(f"Failed to download. Status code: {response.status_code}")
        print("Check if your MAXMIND_LICENSE_KEY is correct!")
        return
    
    # Save the compressed file
    filename = f"{edition_id}.tar.gz"
    with open(filename, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
            
    # Extract only the .mmdb database file
    print(f"Extracting {edition_id}...")
    with tarfile.open(filename, "r:gz") as tar:
        for member in tar.getmembers():
            if member.name.endswith(".mmdb"):
                # Remove the nested folder structure
                member.name = os.path.basename(member.name)
                tar.extract(member, path=".")
                print(f"✅ Successfully installed: {member.name}")
    
    # Clean up the zip file
    os.remove(filename)

if __name__ == "__main__":
    if not LICENSE_KEY or LICENSE_KEY == "your_actual_maxmind_license_key_here":
        print("Error: Please add your real MAXMIND_LICENSE_KEY to the .env file.")
    else:
        download_and_extract("GeoLite2-City")
        download_and_extract("GeoLite2-ASN")
        print("\nAll databases updated and ready to use!")

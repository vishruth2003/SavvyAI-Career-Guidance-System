import qrcode

def generate_qr_code(data, output_file):
    """
    Generate a QR code for the given data and save it as an image file.

    Args:
        data (str): The data to encode in the QR code.
        output_file (str): The output file path for the QR code image (e.g., 'qrcode.png').
    """
    # Create a QR code instance with optional settings
    qr = qrcode.QRCode(
        version=1,  # Controls the size of the QR code (1-40)
        error_correction=qrcode.constants.ERROR_CORRECT_L,  # Error correction level
        box_size=10,  # Size of each box in the QR code
        border=4,  # Thickness of the border (minimum is 4)
    )

    # Add data to the QR code
    qr.add_data(data)
    qr.make(fit=True)

    # Create an image from the QR code instance
    img = qr.make_image(fill_color="black", back_color="white")

    # Save the image to a file
    img.save(output_file)
    print(f"QR code saved to {output_file}")

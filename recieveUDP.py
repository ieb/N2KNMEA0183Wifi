#!/usr/bin/python3
from socket import *
import sys

if (len(sys.argv)==3 and sys.argv[1]=='-l'):
    try:
        port=int(sys.argv[2])
    except ValueError as verr:
        print('Invalid port number')
        sys.exit(1)
    try:
        s=socket(AF_INET, SOCK_DGRAM)
        s.bind(('',port))
        while True:
            data,address=s.recvfrom(1024)
            print((data.decode('utf-8')).rstrip())
        s.close()

    except (KeyboardInterrupt, SystemExit):
        s.close()
        print('Exit on Keyboard Interrupt')

else:
        print('UDP socket listener by JirkaRCK v1.0\nArguments:\n-l Listen on specific UDP port')

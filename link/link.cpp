#include <iostream>
#include <boost/asio.hpp>
#include <string>
#include "cobs.h"

using namespace std::literals;
using boost::asio::ip::udp;

const auto port = "/dev/ttyACM0"s;
const int baudRate = 115200;

const auto host = "127.0.0.1"s;
const int udpPort = 10015;

int main() {
    try {
        // Initialise serial connection
        // boost::asio::io_context io_context;
        boost::asio::io_service io;
        boost::asio::serial_port serial(io, port);
        serial.set_option(boost::asio::serial_port_base::baud_rate(baudRate));

        boost::asio::streambuf buf;
        std::istream is(&buf);
        std::istringstream iss;

        // Initialise UDP connection
        udp::socket socket(io);
        socket.open(udp::v4());
        udp::endpoint endpoint(boost::asio::ip::make_address_v4(host), udpPort);

        while (true) {
            try {
                boost::asio::read_until(serial, buf, '\0');
                std::string receivedAll(reinterpret_cast<const char *>(buf.data().data()), buf.size());
                // Find the first occurence of a zero
                size_t zeroLocation = receivedAll.find('\0');
                std::string receivedRaw(reinterpret_cast<const char *>(buf.data().data()), zeroLocation);
                buf.consume(zeroLocation + 1);

                // std::cout << "Received packet [" << receivedRaw.size() << "]" << std::endl;

                // COBS decoding
                std::vector<char> buffer(receivedRaw.size());
                auto result = cobs_decode(buffer.data(), buffer.size(), receivedRaw.c_str(),
                                              receivedRaw.size()); // strip the last byte

                if (result.status != COBS_DECODE_OK) {
                    std::cerr << "COBS status returned " << static_cast<int>(result.status) << std::endl;
                } else {
                    // Send correct packet via UDP

                    if (buffer[1] == -1 && buffer[2] == -1) {
                        std::cout << std::string(buffer.data(), result.out_len).substr(4);
                    }

                    socket.send_to(boost::asio::buffer(buffer.data(), result.out_len), endpoint);
                }
            } catch (boost::system::system_error &e) {
                std::cerr << e.what() << std::endl;
                std::this_thread::sleep_for(500ms);
            }
        }
    } catch (boost::system::system_error &e) {
        std::cerr << e.what() << std::endl;
    }

    std::cout << "endl" << std::endl;
}
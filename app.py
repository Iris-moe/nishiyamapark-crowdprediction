from flask import Flask, jsonify, render_template
import requests

app = Flask(__name__, template_folder='.')

# 鯖江市の位置情報とAPI設定
SABAE_LAT = 35.9463
SABAE_LON = 136.1830
OPENWEATHER_API_KEY = "a4dfcfd409c36fb8b60ce5531a51616e"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/weather', methods=['GET'])
def get_weather():
    """鯖江市の気象データをOpenWeather APIから取得して返すエンドポイント"""
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={SABAE_LAT}&lon={SABAE_LON}&appid={OPENWEATHER_API_KEY}&units=metric&lang=ja"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        return jsonify(response.json())
    except Exception as e:
        # エラー時のフォールバックデータ
        return jsonify({
            "main": {"temp": 22.0, "feels_like": 21.5, "humidity": 55},
            "weather": [{"description": "晴れ (Fallback)", "main": "Clear"}],
            "wind": {"speed": 2.1},
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)